<?php
declare(strict_types=1);
require __DIR__.'/../backend/private/bootstrap.php';
$data=json_decode(file_get_contents(__DIR__.'/../backend/seed/content.json'),true,512,JSON_THROW_ON_ERROR);
function ensure(bool $condition,string $label): void {if(!$condition)throw new RuntimeException("FAIL ".$label);echo "PASS ".$label."\n";}
ensure(count($data['categories'])===12,'Twelve categories');
$count=0;foreach($data['categories'] as $c)$count+=count($data['regularMenu'][$c['id']]??[]);
ensure($count===68,'All 68 dishes seeded');
ensure(count($data['gallery'])===5,'Five real gallery photos');
$data['lunchByDate']=[
  '2026-10-08'=>['published'=>false,'groups'=>[['title'=>'Салати','items'=>[['name'=>'Тест']]]]],
  '2026-10-09'=>['published'=>true,'groups'=>[['title'=>'Салати','items'=>[['name'=>'Тест']]]]]
];
$data['news']=[
  ['title'=>'Чернова','published'=>false],
  ['title'=>'Активна','published'=>true,'startDate'=>'2020-01-01'],
  ['title'=>'Бъдеща','published'=>true,'startDate'=>'2099-01-01'],
  ['title'=>'Изтекла','published'=>true,'endDate'=>'2020-01-01']
];
$public=public_content($data);
ensure(!isset(((array)$public['lunchByDate'])['2026-10-08']),'Draft lunch omitted');
ensure(isset(((array)$public['lunchByDate'])['2026-10-09']),'Approved lunch retained');
ensure(count($public['news'])===1 && $public['news'][0]['title']==='Активна','Only currently published news exposed');
ensure(!isset($public['staff']),'Staff details not in public content');


$data['seasonalMenu']=['enabled'=>false,'title'=>'Сезонни предложения','description'=>'','items'=>[['name'=>'Тест','price'=>'5,00 €']]];
$seasonHidden=public_content($data);
ensure($seasonHidden['seasonalMenu']['enabled']===false && $seasonHidden['seasonalMenu']['items']===[],'Disabled seasonal menu has no public dishes');
$data['seasonalMenu']['enabled']=true;
$seasonShown=public_content($data);
ensure($seasonShown['seasonalMenu']['enabled']===true && count($seasonShown['seasonalMenu']['items'])===1,'Enabled seasonal dish appears in public API');

$data['sushiNight']=['enabled'=>false,'weekday'=>null,'startTime'=>'','endTime'=>''];
$off=public_content($data);
ensure($off['sushiNight']['enabled']===false,'Unscheduled sushi is hidden');
$data['sushiNight']=['enabled'=>true,'weekday'=>5,'startTime'=>'18:00','endTime'=>'22:00'];
$on=public_content($data);
ensure($on['sushiNight']['enabled']===true&&$on['sushiNight']['weekday']===5,'Published weekly sushi schedule');
$data['sushiNight']['startTime']='bad';
$invalid=public_content($data);
ensure($invalid['sushiNight']['enabled']===false,'Invalid sushi schedule is never publicly enabled');
