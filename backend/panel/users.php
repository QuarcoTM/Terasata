<?php
declare(strict_types=1);
require dirname(__DIR__).'/private/bootstrap.php';
secure_headers();https_required();start_secure_session();
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
$u=user();if(!$u){header('Location: index.php',true,303);exit;}
if($u['role']!=='owner'){http_response_code(403);exit('Access denied');}
$scopes=['lunch'=>'Обедно меню','regular'=>'Постоянно меню','gallery'=>'Галерия','news'=>'Новини','settings'=>'Настройки'];
$error='';$message='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    if(!hash_equals(csrf(),(string)($_POST['csrf']??''))){http_response_code(403);exit('Invalid token');}
    try{
        $action=(string)($_POST['action']??'');
        if($action==='add'){
            $email=mb_strtolower(trim((string)($_POST['email']??'')));
            $pass=(string)($_POST['password']??'');
            if(!filter_var($email,FILTER_VALIDATE_EMAIL)||mb_strlen($pass)<12||mb_strlen($pass)>200)throw new DomainException('Използвайте валиден имейл и парола от поне 12 символа.');
            $permissions=[];foreach($scopes as $key=>$label)$permissions[$key]=!empty($_POST['scope'][$key]);
            $query=sql()->prepare('INSERT INTO users(email,password_hash,role,permissions,active) VALUES(?,?,?,?,1)');
            $query->execute([$email,password_hash($pass,PASSWORD_DEFAULT),'editor',json_encode($permissions,JSON_THROW_ON_ERROR)]);
            audit((int)$u['id'],'user:create');$message='Служителят е добавен.';
        }elseif($action==='disable'){
            $id=(int)($_POST['id']??0);
            if($id<1||$id===(int)$u['id'])throw new DomainException('Не може да деактивирате собствения си профил.');
            $query=sql()->prepare("UPDATE users SET active=0 WHERE id=? AND role='editor'");$query->execute([$id]);
            audit((int)$u['id'],'user:disable');$message='Служителят е деактивиран.';
        }elseif($action==='enable'){
            $id=(int)($_POST['id']??0);
            $query=sql()->prepare("UPDATE users SET active=1 WHERE id=? AND role='editor'");$query->execute([$id]);
            audit((int)$u['id'],'user:enable');$message='Служителят е активиран.';
        }else throw new DomainException('Невалидно действие.');
    }catch(DomainException $ex){$error=$ex->getMessage();}
    catch(Throwable $ex){error_log($ex->getMessage());$error='Неуспешна операция. Имейлът може вече да съществува.';}
}
$users=sql()->query('SELECT id,email,role,permissions,active,created_at FROM users ORDER BY id')->fetchAll();
function h(string $v): string {return htmlspecialchars($v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
header('Content-Type: text/html; charset=utf-8');
?><!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Служители · Терасата</title><link rel="stylesheet" href="../../assets/css/admin.css"></head><body><main class="workspace" style="margin:auto;max-width:960px"><p><a class="btn secondary" href="index.php">← Към редактора</a></p><h1>Служители и права</h1><p>Само главният администратор създава профили. Паролата не се изпраща по имейл.</p><?php if($error):?><p role="alert" style="color:#a30"><?=h($error)?></p><?php endif;?><?php if($message):?><p role="status"><?=h($message)?></p><?php endif;?><section class="panel"><h2>Нов служител</h2><form method="post"><input type="hidden" name="csrf" value="<?=h(csrf())?>"><input type="hidden" name="action" value="add"><div class="form-settings"><label class="form-field">Имейл<input name="email" type="email" required maxlength="254" autocomplete="off"></label><label class="form-field">Начална парола (минимум 12 знака)<input type="password" name="password" minlength="12" required autocomplete="new-password"></label></div><p>Разрешени секции:</p><?php foreach($scopes as $key=>$label):?><label style="display:inline-flex;gap:8px;margin:10px"><input type="checkbox" name="scope[<?=h($key)?>]" value="1"><?=h($label)?></label><?php endforeach;?><p><button class="btn primary" type="submit">Създай профил</button></p></form></section><section class="panel"><h2>Профили</h2><?php foreach($users as $row):?><div class="list-row"><div><strong><?=h($row['email'])?></strong><small><?=h($row['role'])?> · <?=((int)$row['active']===1?'Активен':'Спрян')?></small></div><?php if($row['role']==='editor'):?><form method="post"><input type="hidden" name="csrf" value="<?=h(csrf())?>"><input type="hidden" name="id" value="<?=(int)$row['id']?>"><input type="hidden" name="action" value="<?=((int)$row['active']===1?'disable':'enable')?>"><button class="btn secondary slim" type="submit"><?=((int)$row['active']===1?'Деактивирай':'Активирай')?></button></form><?php endif;?></div><?php endforeach;?></section></main></body></html>
