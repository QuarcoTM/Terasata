<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/private/bootstrap.php';
$email=mb_strtolower(trim((string)($argv[1]??'')));
if(!filter_var($email,FILTER_VALIDATE_EMAIL)){fwrite(STDERR,"Usage: php backend/bin/setup.php owner@example.com\n");exit(1);}
if(!extension_loaded('pdo_mysql')||!extension_loaded('mbstring')){fwrite(STDERR,"PHP extensions pdo_mysql and mbstring required.\n");exit(1);}
fwrite(STDOUT,"Owner password (12+ characters; input hidden): ");
system('stty -echo');
$password=rtrim((string)fgets(STDIN),"\r\n");
system('stty echo');
fwrite(STDOUT,"\n");
if(mb_strlen($password)<12||mb_strlen($password)>200){fwrite(STDERR,"Password must have 12–200 characters.\n");exit(1);}
try{
 $db=sql();
 $schema=file_get_contents(dirname(__DIR__).'/migrations/001_initial.sql');
 if($schema===false)throw new RuntimeException('Schema missing');
 foreach(explode(';',$schema) as $part){$part=trim($part);if($part!=='')$db->exec($part);}
 $stmt=$db->prepare("INSERT INTO users(email,password_hash,role,permissions,active) VALUES(?,?,'owner','{}',1)");
 $stmt->execute([$email,password_hash($password,PASSWORD_DEFAULT)]);
 $seed=file_get_contents(dirname(__DIR__).'/seed/content.json');
 if($seed===false)throw new RuntimeException('Seed file missing');
 $content=json_decode($seed,true,512,JSON_THROW_ON_ERROR);
 $stmt=$db->prepare('INSERT INTO documents(id,version,content_json,modified_by) VALUES(1,1,?,?)');
 $stmt->execute([json_encode($content,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),(int)$db->lastInsertId()]);
 fwrite(STDOUT,"Database and owner created. Use HTTPS to open /backend/panel/index.php.\n");
}catch(Throwable $ex){
 fwrite(STDERR,"Setup failed: ".$ex->getMessage()."\n");
 exit(1);
}
