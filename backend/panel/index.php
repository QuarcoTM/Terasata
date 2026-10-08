<?php
declare(strict_types=1);
require dirname(__DIR__).'/private/bootstrap.php';
secure_headers();https_required();start_secure_session();
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-".($_SESSION['nonce']=bin2hex(random_bytes(16)))."'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
$nonce=$_SESSION['nonce'];
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    if(!hash_equals(csrf(),(string)($_POST['csrf']??'')))$error='Невалидна заявка. Обновете страницата.';
    else {
        $email=mb_strtolower(trim((string)($_POST['email']??'')));
        $password=(string)($_POST['password']??'');
        if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254||strlen($password)>200)$error='Невалидни данни за вход.';
        else{
            try{
                $db=sql();
                $identity=hash('sha256',$email.'|'.($_SERVER['REMOTE_ADDR']??''));
                $q=$db->prepare('SELECT COUNT(*) FROM auth_attempts WHERE identity_hash=? AND happened_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 15 MINUTE)');
                $q->execute([$identity]);
                if((int)$q->fetchColumn()>=8){http_response_code(429);$error='Твърде много опити. Опитайте след 15 минути.';}
                else{
                    $q=$db->prepare('SELECT id,password_hash,active FROM users WHERE email=? LIMIT 1');$q->execute([$email]);$candidate=$q->fetch();
                    if($candidate && (int)$candidate['active']===1 && password_verify($password,$candidate['password_hash'])){
                        session_regenerate_id(true);
                        $_SESSION['uid']=(int)$candidate['id'];$_SESSION['seen']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));
                        $db->prepare('DELETE FROM auth_attempts WHERE identity_hash=?')->execute([$identity]);
                        audit((int)$candidate['id'],'login');
                        header('Location: index.php',true,303);exit;
                    }
                    $db->prepare('INSERT INTO auth_attempts (identity_hash) VALUES (?)')->execute([$identity]);
                    $error='Невалиден имейл или парола.';
                }
            }catch(Throwable $ex){error_log($ex->getMessage());$error='Входът временно не е достъпен.';}
        }
    }
}
$u=user();
if(!$u){
    $csrfSafe=htmlspecialchars(csrf(),ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    $errorSafe=htmlspecialchars($error,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Вход · Терасата</title><link rel="stylesheet" href="../../assets/css/admin.css"><style>.login-wrap{min-height:100dvh;display:grid;place-items:center;padding:20px}.login-card{width:min(100%,460px);background:#fcf8f0;border:1px solid #d9cbb5;padding:35px}.login-card input{display:block;width:100%;padding:13px;margin:7px 0 19px;border:1px solid #c8bda9}.login-card button{width:100%}.login-error{color:#9b3024}</style></head><body><main class="login-wrap"><form method="post" class="login-card" autocomplete="on"><h1>Терасата</h1><p>Защитен вход за служители</p>'.($error?'<p role="alert" class="login-error">'.$errorSafe.'</p>':'').'<input type="hidden" name="csrf" value="'.$csrfSafe.'"><label>Имейл<input type="email" name="email" required autocomplete="username" maxlength="254"></label><label>Парола<input type="password" name="password" required autocomplete="current-password"></label><button class="btn primary" type="submit">Вход</button></form></main></body></html>';
    exit;
}
try{$doc=current_doc();}catch(Throwable $ex){error_log($ex->getMessage());http_response_code(503);exit('Database unavailable');}
$secure=['csrf'=>csrf(),'version'=>$doc['version'],'user'=>['email'=>$u['email'],'role'=>$u['role'],'permissions'=>$u['permissions']]];
$flags=JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR;
$init='<script nonce="'.$nonce.'">window.TERASATA_CONTENT='.json_encode($doc['content'],$flags).';window.TERASATA_SECURE='.json_encode($secure,$flags).';</script>';
$html=file_get_contents(dirname(__DIR__,2).'/admin/index.html');
if($html===false){http_response_code(503);exit('Panel unavailable');}
$html=str_replace('<base href="../">','<base href="../../">',$html);
$html=preg_replace('~<script>if\(location\.pathname\.endsWith\(.+?</script>~s','',$html,1);
$html=preg_replace_callback('~<script src="assets/js/content\.js\?[^"]+" defer></script>~',static fn(array $match): string => $init,$html,1);
$html=str_replace('ЛОКАЛЕН РЕДАКТОР · A4-6','ЗАЩИТЕН РЕДАКТОР · A4-6',$html);
$html=str_replace('Без реален вход и база данни · Промените са видими само в този браузър','Защитен вход · Сървърна база данни · Публикуване след запис',$html);
$html=str_replace('id="top-preview"','id="top-preview"',$html);
$logout='<form method="post" action="logout.php" style="display:inline"><input type="hidden" name="csrf" value="'.htmlspecialchars(csrf(),ENT_QUOTES,'UTF-8').'"><button class="btn secondary" type="submit">Изход</button></form>';
if($u['role']==='owner')$logout.=' <a class="btn secondary" href="users.php">Служители и права</a>';
$html=str_replace('<!-- ADMIN_ACCOUNT_ACTIONS -->',$logout,$html);
header('Content-Type: text/html; charset=utf-8');
echo $html;
