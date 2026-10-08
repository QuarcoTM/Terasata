<?php
declare(strict_types=1);
require dirname(__DIR__).'/private/bootstrap.php';
secure_headers();https_required();start_secure_session();
$u=require_user();
if(!can_edit($u,'gallery'))json_fail('Permission denied',403);
if($_SERVER['REQUEST_METHOD']!=='POST')json_fail('Method not allowed',405);
check_csrf($_SERVER['HTTP_X_CSRF_TOKEN']??null);
$f=$_FILES['photo']??null;
if(!is_array($f)||($f['error']??-1)!==UPLOAD_ERR_OK || ($f['size']??0)<1 || $f['size']>5*1024*1024)json_fail('Invalid file (max 5 MB)',422);
if(!is_uploaded_file($f['tmp_name'])||!extension_loaded('gd'))json_fail('Image processing unavailable',503);
$info=@getimagesize($f['tmp_name']);
if(!$info||$info[0]<1||$info[1]<1||$info[0]*$info[1]>24000000)json_fail('Invalid image size',422);
$mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
if(!in_array($mime,['image/png','image/jpeg','image/webp'],true)||!in_array($info['mime'],['image/png','image/jpeg','image/webp'],true))json_fail('Unsupported image',422);
try{
    $image=match($mime){
        'image/jpeg'=>imagecreatefromjpeg($f['tmp_name']),
        'image/png'=>imagecreatefrompng($f['tmp_name']),
        'image/webp'=>imagecreatefromwebp($f['tmp_name'])
    };
    if(!$image)json_fail('Unable to decode image',422);
    $scale=min(1,1600/max(imagesx($image),imagesy($image)));
    $width=max(1,(int)round(imagesx($image)*$scale));
    $height=max(1,(int)round(imagesy($image)*$scale));
    $canvas=imagecreatetruecolor($width,$height);
    imagealphablending($canvas,false);imagesavealpha($canvas,true);
    imagecopyresampled($canvas,$image,0,0,0,0,$width,$height,imagesx($image),imagesy($image));
    imagedestroy($image);
    $dir=dirname(__DIR__,2).'/media';
    if(!is_dir($dir)||!is_writable($dir))json_fail('Media directory not configured',503);
    $name=bin2hex(random_bytes(16)).'.webp';
    if(!imagewebp($canvas,$dir.'/'.$name,82)){imagedestroy($canvas);json_fail('Unable to store image',503);}
    imagedestroy($canvas);
    chmod($dir.'/'.$name,0644);
    audit((int)$u['id'],'upload:image');
    json_ok(['ok'=>true,'src'=>'media/'.$name],201);
}catch(Throwable $error){error_log($error->getMessage());json_fail('Unable to store image',503);}
