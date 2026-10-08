<?php
declare(strict_types=1);
require dirname(__DIR__).'/private/bootstrap.php';
secure_headers();https_required();start_secure_session();
$u=require_user();
if($_SERVER['REQUEST_METHOD']==='GET'){
    try{$doc=current_doc();json_ok(['ok'=>true,'version'=>$doc['version'],'content'=>$doc['content'],'user'=>['email'=>$u['email'],'role'=>$u['role'],'permissions'=>$u['permissions']],'csrf'=>csrf()]);}
    catch(Throwable $error){error_log($error->getMessage());json_fail('Database unavailable',503);}
}
if($_SERVER['REQUEST_METHOD']!=='POST')json_fail('Method not allowed',405);
check_csrf($_SERVER['HTTP_X_CSRF_TOKEN']??null);
$post=input_json();
if(!isset($post['version'])||!is_int($post['version'])||!is_array($post['content']??null))json_fail('Invalid payload',422);
$next=$post['content'];
validate_content($next);
try{
    $pdo=sql();$pdo->beginTransaction();
    $doc=current_doc(true);
    if($doc['version']!==$post['version']){$pdo->rollBack();json_fail('Content changed by another editor. Reload before saving.',409);}
    $sectionMap=['categories'=>'regular','regularMenu'=>'regular','lunchByDate'=>'lunch','gallery'=>'gallery','galleryCategories'=>'gallery','news'=>'news',
        'restaurantName'=>'settings','phoneDisplay'=>'settings','phoneHref'=>'settings','addressDisplay'=>'settings',
        'mapsUrl'=>'settings','facebookUrl'=>'settings','instagramUrl'=>'settings','posterSettings'=>'lunch'];
    $changed=[];
    foreach($sectionMap as $key=>$scope){
        $a=$doc['content'][$key]??null;$b=$next[$key]??null;
        if(json_encode($a,JSON_UNESCAPED_UNICODE)!==json_encode($b,JSON_UNESCAPED_UNICODE)){
            if(!can_edit($u,$scope)){$pdo->rollBack();json_fail('Permission denied for '.$scope,403);}
            $changed[$scope]=true;
        }
    }
    if(!$changed){$pdo->commit();json_ok(['ok'=>true,'version'=>$doc['version'],'changed'=>[]]);}
    $query=$pdo->prepare('UPDATE documents SET version=version+1,content_json=?,modified_by=? WHERE id=1');
    $query->execute([json_encode($next,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),(int)$u['id']]);
    audit((int)$u['id'],'save:'.implode(',',array_keys($changed)));
    $pdo->commit();
    json_ok(['ok'=>true,'version'=>$doc['version']+1,'changed'=>array_keys($changed)]);
}catch(Throwable $error){
    if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
    error_log($error->getMessage());json_fail('Unable to save content',503);
}
