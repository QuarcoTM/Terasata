<?php
declare(strict_types=1);
require __DIR__.'/../backend/private/bootstrap.php';
$data=json_decode(file_get_contents(__DIR__.'/../backend/seed/content.json'),true,512,JSON_THROW_ON_ERROR);
function ensure(bool $condition,string $label): void {if(!$condition)throw new RuntimeException("FAIL ".$label);echo "PASS ".$label."\n";}
ensure(count($data['categories'])===7,'Seven categories');
$count=0;foreach($data['categories'] as $c)$count+=count($data['regularMenu'][$c['id']]??[]);
ensure($count===40,'All 40 dishes seeded');
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
