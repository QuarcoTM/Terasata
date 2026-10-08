<?php
declare(strict_types=1);
require dirname(__DIR__).'/private/bootstrap.php';
secure_headers();
if($_SERVER['REQUEST_METHOD']!=='GET')json_fail('Method not allowed',405);
try{
    $doc=current_doc();
    header('Cache-Control: public, max-age=30, must-revalidate');
    header('ETag: "terasata-'.$doc['version'].'"');
    if(($_SERVER['HTTP_IF_NONE_MATCH']??'')==='"terasata-'.$doc['version'].'"'){http_response_code(304);exit;}
    json_ok(['ok'=>true,'version'=>$doc['version'],'content'=>public_content($doc['content'])]);
}catch(Throwable $error){error_log($error->getMessage());json_fail('Content temporarily unavailable',503);}
