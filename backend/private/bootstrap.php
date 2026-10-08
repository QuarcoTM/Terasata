<?php
declare(strict_types=1);

/* Terasata backend. No secrets are committed: configure environment variables on PHP hosting. */
date_default_timezone_set('Europe/Sofia');
function setting(string $name): string { return trim((string)(getenv($name) ?: '')); }
function sql(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $host=setting('TERASATA_DB_HOST'); $db=setting('TERASATA_DB_NAME');
    $user=setting('TERASATA_DB_USER'); $pass=(string)(getenv('TERASATA_DB_PASSWORD') ?: '');
    if ($host==='' || $db==='' || $user==='') throw new RuntimeException('Database not configured');
    $dsn='mysql:host='.$host.';dbname='.$db.';charset=utf8mb4';
    $pdo=new PDO($dsn,$user,$pass,[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES=>false,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT=>5
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}
function secure_headers(): void {
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('X-Frame-Options: DENY');
    header('Cache-Control: no-store, private');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
}
function https_required(): void {
    if (PHP_SAPI==='cli') return;
    if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS']==='off') {
        http_response_code(403);
        exit('HTTPS is required.');
    }
}
function start_secure_session(): void {
    if(session_status()===PHP_SESSION_ACTIVE)return;
    session_name('terasata_secure');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/backend/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
    ini_set('session.use_strict_mode','1');
    ini_set('session.use_only_cookies','1');
    session_start();
    if(!isset($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32));
    if(isset($_SESSION['seen']) && time()-(int)$_SESSION['seen']>1800){
        $_SESSION=[]; session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32));
    }
    $_SESSION['seen']=time();
}
function csrf(): string { return (string)($_SESSION['csrf'] ?? ''); }
function check_csrf(?string $provided): void {
    if(!$provided || !hash_equals(csrf(),$provided)) json_fail('Invalid request token',403);
}
function json_ok(array $payload, int $code=200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    exit;
}
function json_fail(string $message,int $code=400): never { json_ok(['ok'=>false,'error'=>$message],$code); }
function user(): ?array {
    if(empty($_SESSION['uid'])) return null;
    $stmt=sql()->prepare('SELECT id,email,role,permissions,active FROM users WHERE id=? LIMIT 1');
    $stmt->execute([(int)$_SESSION['uid']]);
    $r=$stmt->fetch();
    if(!$r || !(int)$r['active']) { unset($_SESSION['uid']);return null; }
    $r['permissions']=json_decode((string)$r['permissions'],true)?:[];
    return $r;
}
function require_user(): array { $u=user();if(!$u)json_fail('Authentication required',401);return $u; }
function can_edit(array $u,string $section): bool {
    return $u['role']==='owner' || ($u['role']==='editor' && !empty($u['permissions'][$section]));
}
function input_json(int $limit=3145728): array {
    $len=(int)($_SERVER['CONTENT_LENGTH']??0);
    if($len>$limit)json_fail('Request too large',413);
    $raw=file_get_contents('php://input',false,null,0,$limit+1);
    if($raw===false || strlen($raw)>$limit)json_fail('Request too large',413);
    try{$data=json_decode($raw,true,512,JSON_THROW_ON_ERROR);}catch(JsonException){json_fail('Invalid JSON');}
    if(!is_array($data))json_fail('Invalid JSON');
    return $data;
}
function public_content(array $source): array {
    $copy=$source;
    $days=[];
    foreach(($source['lunchByDate']??[]) as $date=>$day){
        if(preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)$date) && is_array($day) && ($day['published']??false)===true)$days[$date]=$day;
    }
    $copy['lunchByDate']=(object)$days;
    $today=(new DateTimeImmutable('now',new DateTimeZone('Europe/Sofia')))->format('Y-m-d');
    $copy['news']=array_values(array_filter($source['news']??[],fn($n)=>is_array($n)&&($n['published']??false)===true && (empty($n['startDate']) || $n['startDate']<=$today) && (empty($n['endDate']) || $n['endDate']>=$today)));
    return $copy;
}
function validate_content(array $next): void {
    $required=['restaurantName','phoneDisplay','phoneHref','addressDisplay','mapsUrl','facebookUrl','instagramUrl','categories','regularMenu','lunchByDate','news','gallery'];
    foreach($required as $key)if(!array_key_exists($key,$next))json_fail('Missing content field: '.$key,422);
    $allowed=[...$required,'galleryCategories','lunchPoster','posterSettings'];
    foreach(array_keys($next) as $key)if(!in_array($key,$allowed,true))json_fail('Unsupported content field',422);
    foreach(['categories','news','gallery'] as $key)if(!is_array($next[$key])||count($next[$key])>300)json_fail('Invalid '.$key,422);
    foreach(['regularMenu','lunchByDate'] as $key)if(!is_array($next[$key]))json_fail('Invalid '.$key,422);
    foreach(['restaurantName','phoneDisplay','phoneHref','addressDisplay','mapsUrl','facebookUrl','instagramUrl'] as $key){
        if(!is_string($next[$key])||mb_strlen($next[$key])>500)json_fail('Invalid '.$key,422);
    }
    if(!preg_match('/^tel:\+?[0-9]{9,16}$/',$next['phoneHref']))json_fail('Invalid phone',422);
    foreach(['mapsUrl','facebookUrl','instagramUrl'] as $key)if(!preg_match('~^https://~i',$next[$key]))json_fail('Only HTTPS links are allowed',422);
    foreach($next['gallery'] as $item){
        if(!is_array($item)||empty($item['src'])||!is_string($item['src'])||strlen($item['src'])>300 || !preg_match('~^(?:assets/images/[a-z0-9-]+\.webp|media/[a-f0-9]{32}\.webp)$~',$item['src']))json_fail('Gallery photos must be uploaded WebP files',422);
    }
    foreach($next['news'] as $item){
        if(!is_array($item)||!is_string($item['title']??null)||!is_string($item['text']??null))json_fail('Invalid news',422);
        if(isset($item['image'])&&!preg_match('~^(?:assets/images/[a-z0-9-]+\.webp|media/[a-f0-9]{32}\.webp)$~',(string)$item['image']))json_fail('Invalid news image',422);
        $from=(string)($item['startDate']??'');$to=(string)($item['endDate']??'');
        if(($from!==''&&!preg_match('/^\d{4}-\d{2}-\d{2}$/',$from))||($to!==''&&!preg_match('/^\d{4}-\d{2}-\d{2}$/',$to))||($from&&$to&&$from>$to))json_fail('Invalid news dates',422);
    }
    foreach($next['lunchByDate'] as $date=>$day){
        if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)$date)||!is_array($day)||!is_array($day['groups']??null))json_fail('Invalid lunch date',422);
        $dt=DateTimeImmutable::createFromFormat('!Y-m-d',(string)$date);
        if(!$dt || $dt->format('Y-m-d')!==$date || ((bool)($day['published']??false) && (int)$dt->format('N')>5))json_fail('Weekend publication is not allowed',422);
    }
}
function current_doc(bool $lock=false): array {
    $query='SELECT version,content_json FROM documents WHERE id=1'.($lock?' FOR UPDATE':'');
    $row=sql()->query($query)->fetch();
    if(!$row)throw new RuntimeException('Content not initialized');
    $content=json_decode((string)$row['content_json'],true,512,JSON_THROW_ON_ERROR);
    return ['version'=>(int)$row['version'],'content'=>$content];
}
function audit(int $actor,string $action): void {
    $q=sql()->prepare('INSERT INTO audit_log (user_id,action,at_utc) VALUES (?,?,UTC_TIMESTAMP())');
    $q->execute([$actor,mb_substr($action,0,150)]);
}
