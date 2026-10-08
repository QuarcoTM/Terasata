<?php
declare(strict_types=1);
require dirname(__DIR__).'/private/bootstrap.php';
secure_headers();https_required();start_secure_session();
if($_SERVER['REQUEST_METHOD']!=='POST') {http_response_code(405);exit;}
if(!hash_equals(csrf(),(string)($_POST['csrf']??''))) {http_response_code(403);exit;}
$uid=(int)($_SESSION['uid']??0);
if($uid){try{audit($uid,'logout');}catch(Throwable $ex){error_log($ex->getMessage());}}
$_SESSION=[];if(ini_get('session.use_cookies'))setcookie(session_name(),'',time()-42000,'/backend/','','',true);
session_destroy();
header('Location: index.php',true,303);
