"""České názvy, latinské názvy a popisy částí BodyParts3D -> models/parts.json."""
import os
from config import STL, AVAIL, SELECTED, LANDMARKS, MODELS, make_avail
import json
import re
import sys

SEL = json.load(open(SELECTED))

# ---------------------------------------------------------------------------
# Popisy skupin (zobrazí se u každé části skupiny)
# ---------------------------------------------------------------------------
G = {
    'skin': 'Největší orgán těla. Chrání před vnějším prostředím, reguluje teplotu a obsahuje receptory pro dotek, tlak, teplotu i bolest.',
    'eye': 'Oční koule – smyslový orgán zraku uložený v očnici.',
    'lips': 'Rty tvoří vchod do ústní dutiny a podílejí se na řeči a mimice.',
    # svaly
    'deltoid': 'Tvoří obrys ramene a zvedá paži do upažení, předpažení i zapažení. Častý zdroj bolesti při přetížení ramene.',
    'pec': 'Přitahuje paži k tělu a stáčí ji dovnitř. Při sedavém životě se zkracuje a táhne ramena dopředu.',
    'pecmin': 'Táhne lopatku dopředu a dolů. Jeho zkrácení přispívá k předsunutým ramenům a může utlačovat nervy a cévy jdoucí do paže.',
    'trap': 'Velký plochý sval šíje a horní části zad. Hýbe lopatkou a drží ramena; horní část bývá při stresu a práci u počítače ztuhlá a bolestivá.',
    'lat': 'Největší sval zad. Přitahuje paži k tělu a dozadu, např. při shybu nebo veslování.',
    'rhomboid': 'Přitahují lopatky k páteři. Jejich oslabení přispívá ke „kulatým zádům“.',
    'levscap': 'Zvedá lopatku a uklání krk. Při napětí způsobuje bolest mezi krkem a lopatkou.',
    'serratus': 'Přidržuje lopatku u hrudníku a otáčí ji při zvedání paže nad hlavu. Při oslabení lopatka „odstává“.',
    'cuff': 'Patří do rotátorové manžety – skupiny malých svalů, které drží hlavici ramenního kloubu. Častý zdroj bolesti při zvedání paže.',
    'teresmaj': 'Přitahuje a stáčí paži dovnitř, spolupracuje se širokým svalem zádovým.',
    'biceps': 'Ohýbá loket a otáčí předloktí dlaní nahoru. Jeho dlouhá šlacha prochází ramenním kloubem.',
    'triceps': 'Natahuje loket. Je hlavním svalem při kliku a odtlačování.',
    'brachialis': 'Hlavní ohýbač lokte, leží pod dvojhlavým svalem.',
    'coraco': 'Přitahuje paži k tělu a pomáhá s předpažením.',
    'flexfore': 'Sval na vnitřní (dlaňové) straně předloktí. Ohýbá zápěstí a prsty; přetížení této skupiny vede ke „golfovému lokti“.',
    'extfore': 'Sval na hřbetní straně předloktí. Natahuje zápěstí a prsty; přetížení při práci s myší či nářadím způsobuje „tenisový loket“.',
    'pronsup': 'Otáčí předloktím (dlaň dolů nebo nahoru), např. při otáčení klíčem.',
    'brachiorad': 'Ohýbá loket, hlavně v poloze „palcem nahoru“, jako při zvedání hrnku.',
    'hand': 'Drobný sval ruky. Zajišťuje jemné pohyby prstů a palce.',
    'retinac': 'Vazivový pruh přes zápěstí. Pod ním vede karpální tunel se středovým nervem.',
    'rectus': 'Ohýbá trup vpřed a spolu s ostatními břišními svaly stabilizuje páteř.',
    'oblique': 'Otáčí a uklání trup, podílí se na stabilitě bederní páteře a na dýchání.',
    'transabd': 'Nejhlubší břišní sval. Funguje jako přirozený „korzet“ a je klíčový pro stabilitu beder.',
    'linea': 'Vazivový šev uprostřed břicha, kde se spojují úpony břišních svalů.',
    'erector': 'Patří ke vzpřimovačům páteře – dlouhým svalům podél páteře, které ji narovnávají a drží. Při přetížení se stahují a bolí.',
    'deepback': 'Hluboký krátký zádový sval. Jemně stabilizuje jednotlivé obratle.',
    'ql': 'Spojuje pánev s posledním žebrem a bederní páteří. Při jednostranném přetížení častý zdroj bolesti v bedrech.',
    'psoas': 'Hlavní ohýbač kyčle, upíná se na bederní páteř. Při dlouhém sezení se zkracuje a může táhnout bedra do prohnutí.',
    'intercostal': 'Mezižeberní sval. Pohybuje žebry při dýchání.',
    'diaphragm': 'Hlavní dýchací sval, odděluje hrudník od břicha. Ovlivňuje i stabilitu trupu a držení těla.',
    'pelvicfloor': 'Sval pánevního dna. Nese orgány malé pánve a podílí se na kontinenci a stabilitě trupu.',
    'glutemax': 'Nejsilnější sval těla. Natahuje kyčel – při chůzi do schodů, vstávání či běhu.',
    'glutemed': 'Stabilizuje pánev při stoji na jedné noze. Jeho slabost přispívá k bolesti kyčle, kolena i beder.',
    'deephip': 'Hluboký sval kyčle, otáčí stehno zevně. Hruškovitý sval může utlačovat sedací nerv.',
    'tfl': 'Napíná stehenní povázku (iliotibiální pruh). Přetížení vede k bolesti na zevní straně kyčle a kolena.',
    'quad': 'Část čtyřhlavého svalu stehenního, který natahuje koleno a chrání ho. Po zranění kolena rychle ochabuje.',
    'ham': 'Patří k hamstringům – zadním stehenním svalům. Ohýbají koleno a natahují kyčel; zkrácené omezují předklon.',
    'adductor': 'Přitahuje nohu k ose těla. Natažení třísel je častým sportovním zraněním.',
    'sartorius': 'Nejdelší sval těla. Ohýbá kyčel i koleno a vytáčí stehno (sed „po turecku“).',
    'calf': 'Lýtkový sval. Zvedá patu (výpon) a přechází v Achillovu šlachu.',
    'achilles': 'Nejsilnější šlacha těla, spojuje lýtkové svaly s patní kostí. Při přetížení bolí nad patou.',
    'shin': 'Sval přední strany bérce. Zvedá špičku nohy; přetížení způsobuje bolest bérce.',
    'peroneal': 'Sval na zevní straně bérce. Stabilizuje kotník a chrání ho před vyvrknutím.',
    'deepcalf': 'Hluboký sval zadní strany bérce. Ohýbá prsty, podpírá klenbu nohy.',
    'popliteus': 'Malý sval v podkolenní jamce, „odemyká“ koleno z propnutí.',
    'foot': 'Krátký sval nohy. Podpírá klenbu a pohybuje prsty.',
    'ligament': 'Pevný vazivový pruh, který zpevňuje a spojuje struktury.',
    'neck': 'Sval krku. Pohybuje hlavou a krční páteří.',
    'scm': 'Otáčí a uklání hlavu. Při předsunutém držení hlavy bývá přetížený.',
    'scalene': 'Kloněný sval krku. Zvedá první žebra při dýchání; mezi nimi probíhá pažní pleteň – napětí může způsobit brnění ruky.',
    'suboccipital': 'Podhlavový sval. Jemně ovládá polohu hlavy; jeho napětí často způsobuje tenzní bolest hlavy.',
    'hyoid': 'Sval v oblasti jazylky. Podílí se na polykání a pohybech hrtanu.',
    'face': 'Mimický sval obličeje. Umožňuje výrazy tváře.',
    'jaw': 'Žvýkací sval. Napětí žvýkacích svalů (např. skřípání zubů) souvisí s bolestí čelisti a hlavy.',
    'scalp': 'Sval nebo aponeuróza kůže hlavy; napětí může přispívat k bolesti hlavy.',
    # kosti
    'skull': 'Kost lebky. Lebka chrání mozek a smyslové orgány.',
    'mandible': 'Jediná pohyblivá kost lebky. Napětí žvýkacích svalů může souviset s bolestí hlavy a krku.',
    'vertC': 'Sedm krčních obratlů nese hlavu a umožňuje velký rozsah pohybu krku.',
    'vertTh': 'Dvanáct hrudních obratlů, ke kterým se připojují žebra.',
    'vertL': 'Pět největších obratlů nese váhu horní části těla.',
    'disc': 'Meziobratlová ploténka tlumí nárazy mezi obratli. Její výhřez může dráždit nerv a způsobit bolest vystřelující do končetiny.',
    'sacrum': 'Spojuje páteř s pánví prostřednictvím křížokyčelních kloubů.',
    'rib': '12 párů žeber tvoří hrudní koš, chrání srdce a plíce a pohybuje se při dýchání.',
    'cartilage': 'Žeberní chrupavka spojuje žebro s hrudní kostí a dává hrudníku pružnost.',
    'sternum': 'Část hrudní kosti uprostřed hrudníku, ke které se připojují žebra a klíční kosti.',
    'clavicle': 'Spojuje hrudní kost s lopatkou. Patří mezi nejčastěji zlomené kosti.',
    'scapula': 'Plochá kost na zádech, kloubně spojená s kostí pažní. Její postavení ovlivňuje funkci ramene.',
    'humerus': 'Dlouhá kost paže. Její hlavice tvoří ramenní kloub, dolní konec loketní kloub.',
    'radius': 'Kost předloktí na straně palce. Otáčí se kolem kosti loketní.',
    'ulna': 'Kost předloktí na straně malíčku, tvoří hrot lokte.',
    'carpal': 'Zápěstní kůstka. Osm zápěstních kůstek tvoří pohyblivé zápěstí a dno karpálního tunelu.',
    'metacarpal': 'Záprstní kost tvoří kostru dlaně.',
    'phalanxH': 'Článek prstu ruky.',
    'hip': 'Pánevní kost (kyčelní, sedací a stydká kost srostlé dohromady). Tvoří jamku kyčelního kloubu.',
    'femur': 'Nejdelší a nejsilnější kost těla. Její hlavice tvoří kyčelní kloub.',
    'patella': 'Kost ve šlaše čtyřhlavého svalu, zlepšuje páku při natažení kolena.',
    'tibia': 'Hlavní nosná kost bérce, na přední straně hmatná pod kůží.',
    'fibula': 'Tenká kost na vnější straně bérce, tvoří zevní kotník.',
    'tarsal': 'Kost zánártí. Zánártní kosti tvoří patu a klenbu nohy.',
    'metatarsal': 'Nártní kost tvoří přední část klenby nohy.',
    'phalanxF': 'Článek prstu nohy.',
    'membrane': 'Pevná vazivová blána mezi dvěma kostmi, slouží i jako úpon svalů.',
    'hyoidbone': 'Jazylka – drobná kost na krku, na kterou se upínají svaly jazyka a krku.',
    'larynx': 'Chrupavka hrtanu („ohryzek“).',
    'nose': 'Chrupavky tvořící tvar nosu.',
    # cévy
    'heart': 'Svalová pumpa, která v klidu přečerpá zhruba 5 litrů krve za minutu.',
    'aorta': 'Největší tepna těla, vede okysličenou krev ze srdce do celého těla.',
    'coronary': 'Věnčitá céva zásobuje krví samotný srdeční sval. Její ucpání způsobuje infarkt.',
    'artery': 'Tepna vede okysličenou krev ze srdce do orgánů a svalů.',
    'vein': 'Žíla vede odkysličenou krev zpět k srdci.',
    'carotid': 'Zásobuje krví hlavu a mozek. Na krku je hmatný její tep.',
    'pulmonary': 'Céva malého (plicního) oběhu mezi srdcem a plícemi.',
    # nervy
    'brain': 'Část mozku. Mozek je řídicím centrem nervové soustavy a teprve v něm vzniká vědomé vnímání bolesti.',
    'cerebellum': 'Mozeček řídí koordinaci pohybů, rovnováhu a svalové napětí.',
    'brainstem': 'Mozkový kmen řídí základní životní funkce (dýchání, srdeční činnost) a propojuje mozek s míchou.',
    'optic': 'Zrakový nerv vede signály ze sítnice do mozku.',
}

# ---------------------------------------------------------------------------
# Svaly: základní název -> (česky, latinsky, skupina)
# ---------------------------------------------------------------------------
M = {
    'abdominal part of pectoralis major': ('Velký prsní sval – břišní část', 'M. pectoralis major, pars abdominalis', 'pec'),
    'clavicular part of pectoralis major': ('Velký prsní sval – klíčková část', 'M. pectoralis major, pars clavicularis', 'pec'),
    'sternocostal part of pectoralis major': ('Velký prsní sval – hrudní část', 'M. pectoralis major, pars sternocostalis', 'pec'),
    'pectoralis minor': ('Malý prsní sval', 'M. pectoralis minor', 'pecmin'),
    'subclavius': ('Podklíčkový sval', 'M. subclavius', 'pecmin'),
    'acromial part of deltoid': ('Deltový sval – střední část', 'M. deltoideus, pars acromialis', 'deltoid'),
    'clavicular part of deltoid': ('Deltový sval – přední část', 'M. deltoideus, pars clavicularis', 'deltoid'),
    'spinal part of deltoid': ('Deltový sval – zadní část', 'M. deltoideus, pars spinalis', 'deltoid'),
    'descending part of trapezius': ('Trapézový sval – horní část', 'M. trapezius, pars descendens', 'trap'),
    'transverse part of trapezius': ('Trapézový sval – střední část', 'M. trapezius, pars transversa', 'trap'),
    'ascending part of trapezius': ('Trapézový sval – dolní část', 'M. trapezius, pars ascendens', 'trap'),
    'latissimus dorsi': ('Široký sval zádový', 'M. latissimus dorsi', 'lat'),
    'rhomboid major': ('Velký rombický sval', 'M. rhomboideus major', 'rhomboid'),
    'rhomboid minor': ('Malý rombický sval', 'M. rhomboideus minor', 'rhomboid'),
    'levator scapulae': ('Zdvihač lopatky', 'M. levator scapulae', 'levscap'),
    'serratus anterior': ('Pilovitý sval přední', 'M. serratus anterior', 'serratus'),
    'serratus posterior inferior': ('Pilovitý sval zadní dolní', 'M. serratus posterior inferior', 'deepback'),
    'serratus posterior superior': ('Pilovitý sval zadní horní', 'M. serratus posterior superior', 'deepback'),
    'supraspinatus': ('Nadhřebenový sval', 'M. supraspinatus', 'cuff'),
    'infraspinatus muscle': ('Podhřebenový sval', 'M. infraspinatus', 'cuff'),
    'teres minor': ('Malý sval oblý', 'M. teres minor', 'cuff'),
    'subscapularis': ('Podlopatkový sval', 'M. subscapularis', 'cuff'),
    'teres major': ('Velký sval oblý', 'M. teres major', 'teresmaj'),
    'long head of biceps brachii': ('Dvojhlavý sval pažní – dlouhá hlava', 'M. biceps brachii, caput longum', 'biceps'),
    'short head of biceps brachii': ('Dvojhlavý sval pažní – krátká hlava', 'M. biceps brachii, caput breve', 'biceps'),
    'long head of triceps brachii': ('Trojhlavý sval pažní – dlouhá hlava', 'M. triceps brachii, caput longum', 'triceps'),
    'lateral head of triceps brachii': ('Trojhlavý sval pažní – zevní hlava', 'M. triceps brachii, caput laterale', 'triceps'),
    'medial head of triceps brachii': ('Trojhlavý sval pažní – vnitřní hlava', 'M. triceps brachii, caput mediale', 'triceps'),
    'anconeus': ('Loketní sval', 'M. anconeus', 'triceps'),
    'brachialis': ('Hluboký sval pažní', 'M. brachialis', 'brachialis'),
    'coracobrachialis': ('Hákový sval pažní', 'M. coracobrachialis', 'coraco'),
    'brachioradialis': ('Sval vřetenní pažní', 'M. brachioradialis', 'brachiorad'),
    'flexor carpi radialis': ('Zápěstní ohýbač vřetenní', 'M. flexor carpi radialis', 'flexfore'),
    'humeral head of flexor carpi ulnaris': ('Zápěstní ohýbač loketní – pažní hlava', 'M. flexor carpi ulnaris, caput humerale', 'flexfore'),
    'ulnar head of flexor carpi ulnaris': ('Zápěstní ohýbač loketní – loketní hlava', 'M. flexor carpi ulnaris, caput ulnare', 'flexfore'),
    'palmaris longus': ('Dlouhý sval dlaňový', 'M. palmaris longus', 'flexfore'),
    'humeroulnar head of flexor digitorum superficialis': ('Povrchový ohýbač prstů – pažní hlava', 'M. flexor digitorum superficialis', 'flexfore'),
    'radial head of flexor digitorum superficialis': ('Povrchový ohýbač prstů – vřetenní hlava', 'M. flexor digitorum superficialis', 'flexfore'),
    'flexor digitorum profundus': ('Hluboký ohýbač prstů', 'M. flexor digitorum profundus', 'flexfore'),
    'flexor pollicis longus': ('Dlouhý ohýbač palce', 'M. flexor pollicis longus', 'flexfore'),
    'humeral head of pronator teres': ('Oblý sval pronační – pažní hlava', 'M. pronator teres, caput humerale', 'pronsup'),
    'ulnar head of pronator teres': ('Oblý sval pronační – loketní hlava', 'M. pronator teres, caput ulnare', 'pronsup'),
    'pronator quadratus': ('Čtyřhranný sval pronační', 'M. pronator quadratus', 'pronsup'),
    'supinator': ('Sval odvracející (supinátor)', 'M. supinator', 'pronsup'),
    'extensor carpi radialis brevis': ('Krátký zápěstní natahovač vřetenní', 'M. extensor carpi radialis brevis', 'extfore'),
    'extensor carpi radialis longus': ('Dlouhý zápěstní natahovač vřetenní', 'M. extensor carpi radialis longus', 'extfore'),
    'humeral head of extensor carpi ulnaris': ('Zápěstní natahovač loketní – pažní hlava', 'M. extensor carpi ulnaris', 'extfore'),
    'ulnar head of extensor carpi ulnaris': ('Zápěstní natahovač loketní – loketní hlava', 'M. extensor carpi ulnaris', 'extfore'),
    'extensor digitorum': ('Natahovač prstů', 'M. extensor digitorum', 'extfore'),
    'extensor digiti minimi': ('Natahovač malíku', 'M. extensor digiti minimi', 'extfore'),
    'extensor indicis': ('Natahovač ukazováku', 'M. extensor indicis', 'extfore'),
    'extensor pollicis brevis': ('Krátký natahovač palce', 'M. extensor pollicis brevis', 'extfore'),
    'extensor pollicis longus': ('Dlouhý natahovač palce', 'M. extensor pollicis longus', 'extfore'),
    'abductor pollicis longus': ('Dlouhý odtahovač palce', 'M. abductor pollicis longus', 'extfore'),
    'flexor retinaculum of wrist': ('Poutač ohýbačů (karpální vaz)', 'Retinaculum musculorum flexorum', 'retinac'),
    'abductor pollicis brevis': ('Krátký odtahovač palce', 'M. abductor pollicis brevis', 'hand'),
    'opponens pollicis': ('Opozitor palce', 'M. opponens pollicis', 'hand'),
    'deep head of flexor pollicis brevis': ('Krátký ohýbač palce – hluboká hlava', 'M. flexor pollicis brevis', 'hand'),
    'superficial head of flexor pollicis brevis': ('Krátký ohýbač palce – povrchová hlava', 'M. flexor pollicis brevis', 'hand'),
    'oblique head of adductor pollicis': ('Přitahovač palce – šikmá hlava', 'M. adductor pollicis', 'hand'),
    'transverse head of adductor pollicis': ('Přitahovač palce – příčná hlava', 'M. adductor pollicis', 'hand'),
    'abductor digiti minimi of hand': ('Odtahovač malíku', 'M. abductor digiti minimi manus', 'hand'),
    'flexor digiti minimi brevis of hand': ('Krátký ohýbač malíku', 'M. flexor digiti minimi brevis', 'hand'),
    'opponens digiti minimi of hand': ('Opozitor malíku', 'M. opponens digiti minimi', 'hand'),
    'set of lumbricals of hand': ('Červovité svaly ruky', 'Mm. lumbricales manus', 'hand'),
    'set of dorsal interossei of hand': ('Mezikostní svaly ruky – hřbetní', 'Mm. interossei dorsales manus', 'hand'),
    'set of palmar interossei of hand': ('Mezikostní svaly ruky – dlaňové', 'Mm. interossei palmares', 'hand'),
    'rectus abdominis': ('Přímý sval břišní', 'M. rectus abdominis', 'rectus'),
    'pyramidalis': ('Jehlanovitý sval', 'M. pyramidalis', 'rectus'),
    'external oblique': ('Zevní šikmý sval břišní', 'M. obliquus externus abdominis', 'oblique'),
    'internal oblique': ('Vnitřní šikmý sval břišní', 'M. obliquus internus abdominis', 'oblique'),
    'transversus abdominis': ('Příčný sval břišní', 'M. transversus abdominis', 'transabd'),
    'linea alba': ('Bílá čára', 'Linea alba', 'linea'),
    'inguinal ligament': ('Tříselný vaz', 'Ligamentum inguinale', 'ligament'),
    'iliocostalis cervicis': ('Bedrokyčelní žeberní sval – krční část', 'M. iliocostalis cervicis', 'erector'),
    'iliocostalis lumborum': ('Bedrokyčelní žeberní sval – bederní část', 'M. iliocostalis lumborum', 'erector'),
    'iliocostalis thoracis': ('Bedrokyčelní žeberní sval – hrudní část', 'M. iliocostalis thoracis', 'erector'),
    'longissimus capitis': ('Nejdelší sval – hlavová část', 'M. longissimus capitis', 'erector'),
    'longissimus cervicis': ('Nejdelší sval – krční část', 'M. longissimus cervicis', 'erector'),
    'longissimus thoracis': ('Nejdelší sval – hrudní část', 'M. longissimus thoracis', 'erector'),
    'spinalis cervicis': ('Trnový sval – krční část', 'M. spinalis cervicis', 'erector'),
    'spinalis thoracis': ('Trnový sval – hrudní část', 'M. spinalis thoracis', 'erector'),
    'semispinalis capitis': ('Poloostnatý sval hlavy', 'M. semispinalis capitis', 'deepback'),
    'semispinalis cervicis': ('Poloostnatý sval krku', 'M. semispinalis cervicis', 'deepback'),
    'semispinalis thoracis': ('Poloostnatý sval hrudníku', 'M. semispinalis thoracis', 'deepback'),
    'multifidus': ('Mnohoklanný sval', 'M. multifidus', 'deepback'),
    'cervical rotator': ('Krční rotátory', 'Mm. rotatores cervicis', 'deepback'),
    'thoracic rotator': ('Hrudní rotátory', 'Mm. rotatores thoracis', 'deepback'),
    'lumbar rotator': ('Bederní rotátory', 'Mm. rotatores lumborum', 'deepback'),
    'set of interspinales cervicis': ('Mezitrnové svaly krční', 'Mm. interspinales cervicis', 'deepback'),
    'set of interspinales thoracis': ('Mezitrnové svaly hrudní', 'Mm. interspinales thoracis', 'deepback'),
    'set of interspinales lumborum': ('Mezitrnové svaly bederní', 'Mm. interspinales lumborum', 'deepback'),
    'set of anterior cervical intertransversarii': ('Mezipříčné svaly krční přední', 'Mm. intertransversarii anteriores cervicis', 'deepback'),
    'set of posterior cervical intertransversarii': ('Mezipříčné svaly krční zadní', 'Mm. intertransversarii posteriores cervicis', 'deepback'),
    'set of lateral lumbar intertransversarius muscles': ('Mezipříčné svaly bederní zevní', 'Mm. intertransversarii laterales lumborum', 'deepback'),
    'set of medial lumbar intertransversarius muscles': ('Mezipříčné svaly bederní vnitřní', 'Mm. intertransversarii mediales lumborum', 'deepback'),
    'set of levatores costarum breves': ('Krátké zdvihače žeber', 'Mm. levatores costarum breves', 'deepback'),
    'set of levatores costarum longi': ('Dlouhé zdvihače žeber', 'Mm. levatores costarum longi', 'deepback'),
    'splenius capitis': ('Řemenový sval hlavy', 'M. splenius capitis', 'neck'),
    'splenius cervicis': ('Řemenový sval krku', 'M. splenius cervicis', 'neck'),
    'quadratus lumborum': ('Čtyřhranný sval bederní', 'M. quadratus lumborum', 'ql'),
    'psoas major': ('Velký sval bederní', 'M. psoas major', 'psoas'),
    'iliacus': ('Sval kyčelní', 'M. iliacus', 'psoas'),
    'external intercostal muscle': ('Zevní mezižeberní svaly', 'Mm. intercostales externi', 'intercostal'),
    'internal intercostal muscle': ('Vnitřní mezižeberní svaly', 'Mm. intercostales interni', 'intercostal'),
    'innermost intercostal muscle': ('Nejvnitřnější mezižeberní svaly', 'Mm. intercostales intimi', 'intercostal'),
    'transversus thoracis': ('Příčný sval hrudní', 'M. transversus thoracis', 'intercostal'),
    'diaphragm': ('Bránice', 'Diaphragma', 'diaphragm'),
    'coccygeus': ('Kostrčový sval', 'M. coccygeus', 'pelvicfloor'),
    'iliococcygeus': ('Sval kyčlokostrční', 'M. iliococcygeus', 'pelvicfloor'),
    'pubococcygeus': ('Sval stydkokostrční', 'M. pubococcygeus', 'pelvicfloor'),
    'puborectalis': ('Sval stydkokonečníkový', 'M. puborectalis', 'pelvicfloor'),
    'tendinous arch of levator ani': ('Šlašitý oblouk zdvihače řiti', 'Arcus tendineus m. levatoris ani', 'pelvicfloor'),
    'gluteus maximus': ('Velký sval hýžďový', 'M. gluteus maximus', 'glutemax'),
    'gluteus medius': ('Střední sval hýžďový', 'M. gluteus medius', 'glutemed'),
    'gluteus minimus': ('Malý sval hýžďový', 'M. gluteus minimus', 'glutemed'),
    'piriformis': ('Hruškovitý sval', 'M. piriformis', 'deephip'),
    'gemellus inferior': ('Dolní sval dvojčitý', 'M. gemellus inferior', 'deephip'),
    'gemellus superior': ('Horní sval dvojčitý', 'M. gemellus superior', 'deephip'),
    'obturator externus': ('Zevní sval ucpávací', 'M. obturatorius externus', 'deephip'),
    'obturator internus': ('Vnitřní sval ucpávací', 'M. obturatorius internus', 'deephip'),
    'quadratus femoris': ('Čtyřhranný sval stehenní', 'M. quadratus femoris', 'deephip'),
    'tensor fasciae latae': ('Napínač povázky stehenní', 'M. tensor fasciae latae', 'tfl'),
    'rectus femoris': ('Přímý sval stehenní', 'M. rectus femoris (m. quadriceps femoris)', 'quad'),
    'vastus intermedius': ('Prostřední hlava čtyřhlavého svalu', 'M. vastus intermedius', 'quad'),
    'vastus lateralis': ('Zevní hlava čtyřhlavého svalu', 'M. vastus lateralis', 'quad'),
    'vastus medialis': ('Vnitřní hlava čtyřhlavého svalu', 'M. vastus medialis', 'quad'),
    'long head of biceps femoris': ('Dvojhlavý sval stehenní – dlouhá hlava', 'M. biceps femoris, caput longum', 'ham'),
    'short head of biceps femoris': ('Dvojhlavý sval stehenní – krátká hlava', 'M. biceps femoris, caput breve', 'ham'),
    'semimembranosus': ('Sval poloblanitý', 'M. semimembranosus', 'ham'),
    'semitendinosus': ('Sval pološlašitý', 'M. semitendinosus', 'ham'),
    'adductor brevis': ('Krátký přitahovač stehna', 'M. adductor brevis', 'adductor'),
    'adductor longus': ('Dlouhý přitahovač stehna', 'M. adductor longus', 'adductor'),
    'adductor magnus': ('Velký přitahovač stehna', 'M. adductor magnus', 'adductor'),
    'adductor minimus': ('Nejmenší přitahovač stehna', 'M. adductor minimus', 'adductor'),
    'gracilis': ('Štíhlý sval', 'M. gracilis', 'adductor'),
    'pectineus': ('Sval hřebenový', 'M. pectineus', 'adductor'),
    'sartorius': ('Krejčovský sval', 'M. sartorius', 'sartorius'),
    'lateral head of gastrocnemius': ('Dvojhlavý sval lýtkový – zevní hlava', 'M. gastrocnemius, caput laterale', 'calf'),
    'medial head of gastrocnemius': ('Dvojhlavý sval lýtkový – vnitřní hlava', 'M. gastrocnemius, caput mediale', 'calf'),
    'soleus': ('Šikmý sval lýtkový', 'M. soleus', 'calf'),
    'plantaris': ('Sval chodidlový', 'M. plantaris', 'calf'),
    'calcaneal tendon': ('Achillova šlacha', 'Tendo calcaneus', 'achilles'),
    'popliteus': ('Sval podkolenní', 'M. popliteus', 'popliteus'),
    'tibialis anterior': ('Přední sval holenní', 'M. tibialis anterior', 'shin'),
    'extensor digitorum longus': ('Dlouhý natahovač prstů nohy', 'M. extensor digitorum longus', 'shin'),
    'extensor hallucis longus': ('Dlouhý natahovač palce nohy', 'M. extensor hallucis longus', 'shin'),
    'fibularis tertius': ('Třetí sval lýtkový', 'M. fibularis tertius', 'shin'),
    'fibularis brevis': ('Krátký sval lýtkový', 'M. fibularis brevis', 'peroneal'),
    'fibularis longus': ('Dlouhý sval lýtkový', 'M. fibularis longus', 'peroneal'),
    'tibialis posterior': ('Zadní sval holenní', 'M. tibialis posterior', 'deepcalf'),
    'flexor digitorum longus': ('Dlouhý ohýbač prstů nohy', 'M. flexor digitorum longus', 'deepcalf'),
    'flexor hallucis longus': ('Dlouhý ohýbač palce nohy', 'M. flexor hallucis longus', 'deepcalf'),
    'long plantar ligament': ('Dlouhý plantární vaz', 'Ligamentum plantare longum', 'ligament'),
    'intermediate tendon': ('Vmezeřená šlacha dvojbříškového svalu', 'Tendo intermedius m. digastrici', 'hyoid'),
    'abductor hallucis': ('Odtahovač palce nohy', 'M. abductor hallucis', 'foot'),
    'abductor digiti minimi of foot': ('Odtahovač malíku nohy', 'M. abductor digiti minimi pedis', 'foot'),
    'extensor digitorum brevis': ('Krátký natahovač prstů nohy', 'M. extensor digitorum brevis', 'foot'),
    'extensor hallucis brevis': ('Krátký natahovač palce nohy', 'M. extensor hallucis brevis', 'foot'),
    'flexor accessorius': ('Čtyřhranný sval chodidla', 'M. quadratus plantae', 'foot'),
    'flexor digiti minimi brevis of foot': ('Krátký ohýbač malíku nohy', 'M. flexor digiti minimi brevis pedis', 'foot'),
    'flexor digitorum brevis': ('Krátký ohýbač prstů nohy', 'M. flexor digitorum brevis', 'foot'),
    'lateral head of flexor hallucis brevis': ('Krátký ohýbač palce nohy – zevní hlava', 'M. flexor hallucis brevis', 'foot'),
    'medial head of flexor hallucis brevis': ('Krátký ohýbač palce nohy – vnitřní hlava', 'M. flexor hallucis brevis', 'foot'),
    'oblique head of adductor hallucis': ('Přitahovač palce nohy – šikmá hlava', 'M. adductor hallucis', 'foot'),
    'transverse head of adductor hallucis': ('Přitahovač palce nohy – příčná hlava', 'M. adductor hallucis', 'foot'),
    'opponens digiti minimi of foot': ('Opozitor malíku nohy', 'M. opponens digiti minimi pedis', 'foot'),
    'set of dorsal interossei of foot': ('Mezikostní svaly nohy – hřbetní', 'Mm. interossei dorsales pedis', 'foot'),
    'sternocleidomastoid': ('Zdvihač hlavy', 'M. sternocleidomastoideus', 'scm'),
    'scalenus anterior': ('Přední sval kloněný', 'M. scalenus anterior', 'scalene'),
    'scalenus medius': ('Střední sval kloněný', 'M. scalenus medius', 'scalene'),
    'scalenus posterior': ('Zadní sval kloněný', 'M. scalenus posterior', 'scalene'),
    'longus capitis': ('Dlouhý sval hlavy', 'M. longus capitis', 'neck'),
    'inferior oblique part of longus colli': ('Dlouhý sval krku – dolní šikmá část', 'M. longus colli', 'neck'),
    'superior oblique part of longus colli': ('Dlouhý sval krku – horní šikmá část', 'M. longus colli', 'neck'),
    'vertical intermediate part of longus colli': ('Dlouhý sval krku – svislá část', 'M. longus colli', 'neck'),
    'rectus capitis anterior': ('Přímý sval hlavy přední', 'M. rectus capitis anterior', 'neck'),
    'rectus capitis lateralis': ('Přímý sval hlavy postranní', 'M. rectus capitis lateralis', 'neck'),
    'rectus capitis posterior major': ('Velký přímý sval hlavy zadní', 'M. rectus capitis posterior major', 'suboccipital'),
    'rectus capitis posterior minor': ('Malý přímý sval hlavy zadní', 'M. rectus capitis posterior minor', 'suboccipital'),
    'obliquus capitis inferior': ('Dolní šikmý sval hlavy', 'M. obliquus capitis inferior', 'suboccipital'),
    'obliquus capitis superior': ('Horní šikmý sval hlavy', 'M. obliquus capitis superior', 'suboccipital'),
    'platysma': ('Podkožní sval krční', 'Platysma', 'face'),
    'geniohyoid': ('Sval bradojazylkový', 'M. geniohyoideus', 'hyoid'),
    'mylohyoid': ('Sval čelistnějazylkový', 'M. mylohyoideus', 'hyoid'),
    'omohyoid': ('Sval lopatkojazylkový', 'M. omohyoideus', 'hyoid'),
    'sternohyoid': ('Sval hrudnějazylkový', 'M. sternohyoideus', 'hyoid'),
    'sternothyroid': ('Sval hrudněštítný', 'M. sternothyroideus', 'hyoid'),
    'stylohyoid': ('Sval bodcojazylkový', 'M. stylohyoideus', 'hyoid'),
    'thyrohyoid': ('Sval štítnojazylkový', 'M. thyrohyoideus', 'hyoid'),
    'anterior belly of digastric': ('Dvojbříškový sval – přední bříško', 'M. digastricus, venter anterior', 'hyoid'),
    'posterior belly of digastric': ('Dvojbříškový sval – zadní bříško', 'M. digastricus, venter posterior', 'hyoid'),
    'temporalis': ('Spánkový sval', 'M. temporalis', 'jaw'),
    'deep part of masseter': ('Žvýkací sval – hluboká část', 'M. masseter, pars profunda', 'jaw'),
    'superficial part of masseter': ('Žvýkací sval – povrchová část', 'M. masseter, pars superficialis', 'jaw'),
    'medial pterygoid': ('Vnitřní sval křídlový', 'M. pterygoideus medialis', 'jaw'),
    'lower head of lateral pterygoid': ('Zevní sval křídlový – dolní hlava', 'M. pterygoideus lateralis', 'jaw'),
    'upper head of lateral pterygoid': ('Zevní sval křídlový – horní hlava', 'M. pterygoideus lateralis', 'jaw'),
    'buccinator': ('Tvářový sval', 'M. buccinator', 'face'),
    'corrugator supercilii': ('Svraštovač obočí', 'M. corrugator supercilii', 'face'),
    'depressor anguli oris': ('Stlačovač ústního koutku', 'M. depressor anguli oris', 'face'),
    'depressor labii inferioris': ('Stlačovač dolního rtu', 'M. depressor labii inferioris', 'face'),
    'depressor septi nasi': ('Stlačovač nosní přepážky', 'M. depressor septi nasi', 'face'),
    'levator anguli oris': ('Zdvihač ústního koutku', 'M. levator anguli oris', 'face'),
    'levator labii superioris': ('Zdvihač horního rtu', 'M. levator labii superioris', 'face'),
    'levator labii superioris alaeque nasi': ('Zdvihač horního rtu a nosního křídla', 'M. levator labii superioris alaeque nasi', 'face'),
    'mentalis': ('Bradový sval', 'M. mentalis', 'face'),
    'nasalis': ('Nosní sval', 'M. nasalis', 'face'),
    'orbicularis oris': ('Kruhový sval ústní', 'M. orbicularis oris', 'face'),
    'orbital part of orbicularis oculi': ('Kruhový sval oční – očnicová část', 'M. orbicularis oculi, pars orbitalis', 'face'),
    'palpebral part of orbicularis oculi': ('Kruhový sval oční – víčková část', 'M. orbicularis oculi, pars palpebralis', 'face'),
    'procerus': ('Sval štíhlý nosní', 'M. procerus', 'face'),
    'risorius': ('Smějový sval', 'M. risorius', 'face'),
    'zygomaticus major': ('Velký sval jařmový', 'M. zygomaticus major', 'face'),
    'zygomaticus minor': ('Malý sval jařmový', 'M. zygomaticus minor', 'face'),
    'frontalis': ('Čelní sval', 'M. frontalis (m. occipitofrontalis)', 'scalp'),
    'occipitalis': ('Týlní sval', 'M. occipitalis (m. occipitofrontalis)', 'scalp'),
    'temporoparietalis': ('Spánkotemenní sval', 'M. temporoparietalis', 'scalp'),
    'aponeurosis of epicranius': ('Lebeční aponeuróza', 'Galea aponeurotica', 'scalp'),
    'iliotibial tract': ('Iliotibiální pruh', 'Tractus iliotibialis', 'tfl'),
}
ORD_CS = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8,
          'ninth': 9, 'tenth': 10, 'eleventh': 11, 'twelfth': 12}
LAT_ORD = {1: 'prima', 2: 'secunda', 3: 'tertia', 4: 'quarta', 5: 'quinta', 6: 'sexta', 7: 'septima', 8: 'octava',
           9: 'nona', 10: 'decima', 11: 'undecima', 12: 'duodecima'}
FINGERS = {'thumb': ('palce', 'pollicis'), 'index finger': ('ukazováku', 'indicis'), 'middle finger': ('prostředníku', 'digiti medii'),
           'ring finger': ('prsteníku', 'digiti anularis'), 'little finger': ('malíku', 'digiti minimi'),
           'big toe': ('palce nohy', 'hallucis'), 'second toe': ('2. prstu nohy', 'digiti II pedis'),
           'third toe': ('3. prstu nohy', 'digiti III pedis'), 'fourth toe': ('4. prstu nohy', 'digiti IV pedis'),
           'little toe': ('malíku nohy', 'digiti minimi pedis')}
PHAL = {'proximal': ('Základní', 'proximalis'), 'middle': ('Střední', 'media'), 'distal': ('Koncový', 'distalis')}

B = {
    'frontal bone': ('Kost čelní', 'Os frontale', 'skull'), 'parietal bone': ('Kost temenní', 'Os parietale', 'skull'),
    'occipital bone': ('Kost týlní', 'Os occipitale', 'skull'), 'temporal bone': ('Kost spánková', 'Os temporale', 'skull'),
    'sphenoid bone': ('Kost klínová', 'Os sphenoidale', 'skull'), 'ethmoid': ('Kost čichová', 'Os ethmoidale', 'skull'),
    'maxilla': ('Horní čelist', 'Maxilla', 'skull'), 'mandible': ('Dolní čelist', 'Mandibula', 'mandible'),
    'zygomatic bone': ('Kost lícní', 'Os zygomaticum', 'skull'), 'nasal bone': ('Kost nosní', 'Os nasale', 'skull'),
    'lacrimal bone': ('Kost slzní', 'Os lacrimale', 'skull'), 'palatine bone': ('Kost patrová', 'Os palatinum', 'skull'),
    'vomer': ('Radličná kost', 'Vomer', 'skull'), 'inferior nasal concha': ('Dolní skořepa nosní', 'Concha nasalis inferior', 'skull'),
    'set of nasal cartilages': ('Nosní chrupavky', 'Cartilagines nasi', 'nose'),
    'hyoid bone': ('Jazylka', 'Os hyoideum', 'hyoidbone'), 'thyroid cartilage': ('Štítná chrupavka', 'Cartilago thyroidea', 'larynx'),
    'atlas': ('Nosič (1. krční obratel, C1)', 'Atlas', 'vertC'), 'axis': ('Čepovec (2. krční obratel, C2)', 'Axis', 'vertC'),
    'sacrum': ('Kost křížová', 'Os sacrum', 'sacrum'),
    'manubrium': ('Hrudní kost – rukověť', 'Manubrium sterni', 'sternum'), 'body of sternum': ('Hrudní kost – tělo', 'Corpus sterni', 'sternum'),
    'xiphoid process': ('Hrudní kost – mečovitý výběžek', 'Processus xiphoideus', 'sternum'),
    'clavicle': ('Klíční kost', 'Clavicula', 'clavicle'), 'scapula': ('Lopatka', 'Scapula', 'scapula'),
    'humerus': ('Kost pažní', 'Humerus', 'humerus'), 'radius': ('Kost vřetenní', 'Radius', 'radius'), 'ulna': ('Kost loketní', 'Ulna', 'ulna'),
    'scaphoid': ('Kost člunková', 'Os scaphoideum', 'carpal'), 'lunate': ('Kost poloměsíčitá', 'Os lunatum', 'carpal'),
    'triquetral': ('Kost trojhranná', 'Os triquetrum', 'carpal'), 'pisiform': ('Kost hrášková', 'Os pisiforme', 'carpal'),
    'trapezium': ('Kost mnohohranná větší', 'Os trapezium', 'carpal'), 'trapezoid': ('Kost mnohohranná menší', 'Os trapezoideum', 'carpal'),
    'capitate': ('Kost hlavatá', 'Os capitatum', 'carpal'), 'hamate': ('Kost hákovitá', 'Os hamatum', 'carpal'),
    'hip bone': ('Pánevní kost', 'Os coxae', 'hip'), 'femur': ('Kost stehenní', 'Femur', 'femur'), 'patella': ('Čéška', 'Patella', 'patella'),
    'tibia': ('Kost holenní', 'Tibia', 'tibia'), 'fibula': ('Kost lýtková', 'Fibula', 'fibula'),
    'talus': ('Kost hlezenní', 'Talus', 'tarsal'), 'calcaneus': ('Kost patní', 'Calcaneus', 'tarsal'),
    'navicular bone of foot': ('Kost loďkovitá', 'Os naviculare', 'tarsal'), 'cuboid bone': ('Kost krychlová', 'Os cuboideum', 'tarsal'),
    'medial cuneiform bone': ('Kost klínová vnitřní', 'Os cuneiforme mediale', 'tarsal'),
    'intermediate cuneiform bone': ('Kost klínová prostřední', 'Os cuneiforme intermedium', 'tarsal'),
    'lateral cuneiform bone': ('Kost klínová zevní', 'Os cuneiforme laterale', 'tarsal'),
    'sesamoid bone of foot': ('Sezamská kůstka nohy', 'Os sesamoideum pedis', 'tarsal'),
    'interosseous membrane of forearm': ('Mezikostní membrána předloktí', 'Membrana interossea antebrachii', 'membrane'),
    'interosseous membrane of leg': ('Mezikostní membrána bérce', 'Membrana interossea cruris', 'membrane'),
}

V = {
    'wall of heart': ('Srdce', 'Cor', 'heart'), 'ascending aorta': ('Vzestupná aorta', 'Aorta ascendens', 'aorta'),
    'arch of aorta': ('Oblouk aorty', 'Arcus aortae', 'aorta'), 'descending aorta': ('Sestupná aorta', 'Aorta descendens', 'aorta'),
    'brachiocephalic artery, nsn': ('Kmen hlavopažní', 'Truncus brachiocephalicus', 'artery'),
    'common carotid artery': ('Společná krkavice', 'A. carotis communis', 'carotid'),
    'subclavian artery': ('Podklíčková tepna', 'A. subclavia', 'artery'),
    'subclavian vein': ('Podklíčková žíla', 'V. subclavia', 'vein'),
    'brachiocephalic vein': ('Hlavopažní žíla', 'V. brachiocephalica', 'vein'),
    'internal jugular vein': ('Vnitřní hrdelní žíla', 'V. jugularis interna', 'vein'),
    'superior vena cava': ('Horní dutá žíla', 'V. cava superior', 'vein'),
    'inferior vena cava': ('Dolní dutá žíla', 'V. cava inferior', 'vein'),
    'common iliac artery': ('Společná kyčelní tepna', 'A. iliaca communis', 'artery'),
    'external iliac artery': ('Zevní kyčelní tepna', 'A. iliaca externa', 'artery'),
    'internal iliac artery': ('Vnitřní kyčelní tepna', 'A. iliaca interna', 'artery'),
    'common iliac vein': ('Společná kyčelní žíla', 'V. iliaca communis', 'vein'),
    'external iliac vein': ('Zevní kyčelní žíla', 'V. iliaca externa', 'vein'),
    'internal iliac vein': ('Vnitřní kyčelní žíla', 'V. iliaca interna', 'vein'),
    'renal artery': ('Ledvinová tepna', 'A. renalis', 'artery'), 'renal vein': ('Ledvinová žíla', 'V. renalis', 'vein'),
    'celiac artery': ('Kmen útrobní', 'Truncus coeliacus', 'artery'),
    'common hepatic artery': ('Společná jaterní tepna', 'A. hepatica communis', 'artery'),
    'gastric artery': ('Levá žaludeční tepna', 'A. gastrica sinistra', 'artery'),
    'splenic artery': ('Slezinná tepna', 'A. splenica', 'artery'), 'splenic vein': ('Slezinná žíla', 'V. splenica', 'vein'),
    'superior mesenteric artery': ('Horní okružní tepna', 'A. mesenterica superior', 'artery'),
    'inferior mesenteric artery': ('Dolní okružní tepna', 'A. mesenterica inferior', 'artery'),
    'superior mesenteric vein': ('Horní okružní žíla', 'V. mesenterica superior', 'vein'),
    'pulmonary artery': ('Plicnice', 'Truncus pulmonalis', 'pulmonary'), 'pulmonary vein': ('Plicní žíly', 'Vv. pulmonales', 'pulmonary'),
    'great cardiac vein': ('Velká srdeční žíla', 'V. cardiaca magna', 'coronary'),
    'middle cardiac vein': ('Střední srdeční žíla', 'V. cardiaca media', 'coronary'),
    'set of anterior cardiac veins': ('Přední srdeční žíly', 'Vv. cardiacae anteriores', 'coronary'),
}

BRAIN = {
    'superior frontal gyrus': 'horní čelní závit', 'middle frontal gyrus': 'střední čelní závit', 'precentral gyrus': 'přední centrální závit (motorická kůra)',
    'postcentral gyrus': 'zadní centrální závit (citlivost těla)', 'superior parietal lobule precuneus': 'temenní lalok',
    'supramarginal gyrus': 'nadokrajový závit', 'angular gyrus': 'úhlový závit', 'occipital lobe': 'týlní lalok (zrak)',
    'anterior part of superior temporal gyrus': 'horní spánkový závit', 'posterior part of superior temporal gyrus': 'horní spánkový závit',
    'middle temporal gyrus': 'střední spánkový závit', 'inferior temporal gyrus': 'dolní spánkový závit', 'fusiform gyrus': 'vřetenovitý závit',
    'parahippocampal gyrus': 'parahipokampální závit', 'cingulate gyrus': 'cingulární závit', 'accessory short gyrus': 'ostrovní závit',
    'orbital gyri straight gyrus': 'očnicové závity',
}


def side_of(name):
    if re.search(r'\bright\b', name):
        return 'prava'
    if re.search(r'\bleft\b', name):
        return 'leva'
    return None


def base_of(name):
    return re.sub(r'\b(right|left) ', '', name).strip()


def describe(fid, name, layer):
    base = base_of(name)
    if layer == 'skin':
        if 'eyeball' in base:
            return 'Oko', 'Bulbus oculi', 'eye'
        if 'labial' in base:
            return 'Rty', 'Labia oris', 'lips'
        return 'Kůže', 'Cutis', 'skin'
    if layer == 'muscles':
        if base in M:
            return M[base]
        m = re.match(r'(\w+) (lumbrical|plantar interosseous) of foot', base)
        if m:
            n = ORD_CS[m.group(1)]
            cs = f'{n}. červovitý sval nohy' if m.group(2) == 'lumbrical' else f'{n}. mezikostní sval nohy – chodidlový'
            la = f'M. lumbricalis {n} pedis' if m.group(2) == 'lumbrical' else f'M. interosseus plantaris {n}'
            return cs, la, 'foot'
        return base.capitalize(), base, 'ligament'
    if layer == 'bones':
        if base in B:
            return B[base]
        m = re.match(r'(\w+) (cervical|thoracic|lumbar) vertebra$', base)
        if m:
            n = ORD_CS[m.group(1)]
            pre, kind, cs = {'cervical': ('C', 'cervicalis', 'krční'), 'thoracic': ('Th', 'thoracica', 'hrudní'),
                             'lumbar': ('L', 'lumbalis', 'bederní')}[m.group(2)]
            return f'{n}. {cs} obratel ({pre}{n})', f'Vertebra {kind} {LAT_ORD[n]}', {'C': 'vertC', 'Th': 'vertTh', 'L': 'vertL'}[pre]
        m = re.match(r'intervertebral disk of (\w+) (cervical|thoracic|lumbar) vertebra$', base)
        if m:
            n = ORD_CS[m.group(1)]
            pre = {'cervical': 'C', 'thoracic': 'Th', 'lumbar': 'L'}[m.group(2)]
            nxt = {'C': 'Th1' if n == 7 else f'C{n + 1}', 'Th': 'L1' if n == 12 else f'Th{n + 1}', 'L': 'S1' if n == 5 else f'L{n + 1}'}[pre]
            return f'Meziobratlová ploténka {pre}{n}/{nxt}', 'Discus intervertebralis', 'disc'
        if base == 'intervertebral disk of axis':
            return 'Meziobratlová ploténka C2/C3', 'Discus intervertebralis', 'disc'
        m = re.match(r'(\w+) rib$', base)
        if m:
            n = ORD_CS[m.group(1)]
            return f'{n}. žebro', f'Costa {LAT_ORD[n]}', 'rib'
        m = re.match(r'(\w+) costal cartilage$', base)
        if m:
            n = ORD_CS[m.group(1)]
            return f'{n}. žeberní chrupavka', f'Cartilago costalis {LAT_ORD[n]}', 'cartilage'
        if base == 'costal cartilage':
            return 'Žeberní chrupavky (8.–10.)', 'Cartilagines costales', 'cartilage'
        m = re.match(r'(\w+) (metacarpal|metatarsal) bone$', base)
        if m:
            n = ORD_CS[m.group(1)]
            if m.group(2) == 'metacarpal':
                return f'{n}. záprstní kost', f'Os metacarpi {["", "I", "II", "III", "IV", "V"][n]}', 'metacarpal'
            return f'{n}. nártní kost', f'Os metatarsi {["", "I", "II", "III", "IV", "V"][n]}', 'metatarsal'
        m = re.match(r'(proximal|middle|distal) phalanx of (.+)$', base)
        if m:
            f_cs, f_la = FINGERS[m.group(2)]
            p_cs, p_la = PHAL[m.group(1)]
            group = 'phalanxF' if 'toe' in m.group(2) else 'phalanxH'
            return f'{p_cs} článek {f_cs}', f'Phalanx {p_la} {f_la}', group
        return base.capitalize(), base, 'skull'
    if layer == 'vessels':
        b = re.sub(r'^(left|right) ', '', base)
        if b in V:
            return V[b]
        if 'coronary' in b:
            cs = 'Pravá věnčitá tepna' if 'right coronary' in name else 'Levá věnčitá tepna'
            if 'branch' in b or 'set of' in b:
                cs += ' – větev'
            return cs, 'A. coronaria', 'coronary'
        return b.capitalize(), b, 'artery'
    if layer == 'nerves':
        if base == 'cerebellum':
            return 'Mozeček', 'Cerebellum', 'cerebellum'
        if base in ('pons', 'medulla oblongata', 'midbrain, nsn'):
            return {'pons': ('Most (Varolův)', 'Pons'), 'medulla oblongata': ('Prodloužená mícha', 'Medulla oblongata'),
                    'midbrain, nsn': ('Střední mozek', 'Mesencephalon')}[base] + ('brainstem',)
        if base in ('optic nerve', 'optic chiasm'):
            return ('Zrakový nerv', 'N. opticus', 'optic') if base == 'optic nerve' else ('Křížení zrakových nervů', 'Chiasma opticum', 'optic')
        part = BRAIN.get(base, base)
        return f'Mozek – {part}', base, 'brain'
    return base, base, 'ligament'


def main():
    out = {}
    missing = set()
    for fid, info in SEL.items():
        cs, la, g = describe(fid, info['name'], info['layer'])
        if g not in G:
            missing.add(g)
        if cs[0].islower() or cs == base_of(info['name']).capitalize():
            missing.add(info['name'])
        out[fid] = {'l': info['layer'], 'n': cs, 'la': la, 'g': g, 's': side_of(info['name'])}
    groups = {k: G[k] for k in sorted({v['g'] for v in out.values()})}
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(MODELS, 'parts.json')
    json.dump({'groups': groups, 'parts': out}, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(out), 'parts; nepřeloženo:', sorted(missing))


if __name__ == '__main__':
    main()
