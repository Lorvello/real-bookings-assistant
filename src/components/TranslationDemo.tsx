import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil', flag: '🇱🇰' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'si', name: 'Sinhala', flag: '🇱🇰' },
  { code: 'my', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'km', name: 'Khmer', flag: '🇰🇭' },
  { code: 'lo', name: 'Lao', flag: '🇱🇦' },
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
  { code: 'eu', name: 'Basque', flag: '🇪🇸' },
  { code: 'be', name: 'Belarusian', flag: '🇧🇾' },
  { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'ga', name: 'Irish', flag: '🇮🇪' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'mt', name: 'Maltese', flag: '🇲🇹' },
  { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
];

const chatMessages = {
  en: {
    customer: "I want to cancel my appointment",
    ai: "I see you have an appointment next Tuesday at 2 PM. I'll cancel that for you."
  },
  es: {
    customer: "Quiero cancelar mi cita",
    ai: "Veo que tienes una cita el próximo martes a las 2 PM. La cancelaré por ti."
  },
  fr: {
    customer: "Je veux annuler mon rendez-vous",
    ai: "Je vois que tu as un rendez-vous mardi prochain à 14h. Je vais l'annuler pour toi."
  },
  de: {
    customer: "Ich möchte meinen Termin stornieren",
    ai: "Ich sehe, dass Sie einen Termin nächsten Dienstag um 14 Uhr haben. Ich werde ihn für Sie stornieren."
  },
  nl: {
    customer: "Ik wil mijn afspraak annuleren",
    ai: "Ik zie dat je een afspraak hebt volgende week dinsdag om 14:00. Ik zal hem voor je annuleren."
  },
  it: {
    customer: "Voglio cancellare il mio appuntamento",
    ai: "Vedo che hai un appuntamento martedì prossimo alle 14. Lo cancellerò per te."
  },
  pt: {
    customer: "Quero cancelar minha consulta",
    ai: "Vejo que você tem uma consulta na próxima terça-feira às 14h. Vou cancelá-la para você."
  },
  ar: {
    customer: "أريد إلغاء موعدي",
    ai: "أرى أن لديك موعداً يوم الثلاثاء القادم في الساعة 2 مساءً. سأقوم بإلغائه لك."
  },
  zh: {
    customer: "我想取消我的预约",
    ai: "我看到您下周二下午2点有一个预约。我将为您取消。"
  },
  ja: {
    customer: "予約をキャンセルしたいです",
    ai: "来週火曜日の午後2時にご予約がありますね。キャンセルいたします。"
  },
  ko: {
    customer: "예약을 취소하고 싶습니다",
    ai: "다음 주 화요일 오후 2시에 예약이 있으시네요. 취소해드리겠습니다."
  },
  ru: {
    customer: "Я хочу отменить свою запись",
    ai: "Я вижу, что у вас есть запись на следующий вторник в 14:00. Я отменю её для вас."
  },
  hi: {
    customer: "मैं अपनी अपॉइंटमेंट रद्द करना चाहता हूं",
    ai: "मैं देख रहा हूं कि आपकी अगले मंगलवार दोपहर 2 बजे अपॉइंटमेंट है। मैं इसे आपके लिए रद्द कर दूंगा।"
  },
  th: {
    customer: "ฉันต้องการยกเลิกการนัดหมาย",
    ai: "ฉันเห็นว่าคุณมีการนัดหมายวันอังคารหน้าเวลา 14:00 น. ฉันจะยกเลิกให้คุณ"
  },
  vi: {
    customer: "Tôi muốn hủy cuộc hẹn của mình",
    ai: "Tôi thấy bạn có cuộc hẹn vào thứ Ba tuần tới lúc 2 giờ chiều. Tôi sẽ hủy nó cho bạn."
  },
  tr: {
    customer: "Randevumu iptal etmek istiyorum",
    ai: "Gelecek Salı saat 14:00'te randevunuz olduğunu görüyorum. Sizin için iptal edeceğim."
  },
  pl: {
    customer: "Chcę anulować swoją wizytę",
    ai: "Widzę, że masz wizytę w przyszły wtorek o 14:00. Anuluję ją dla ciebie."
  },
  sv: {
    customer: "Jag vill avboka min tid",
    ai: "Jag ser att du har en tid nästa tisdag kl 14:00. Jag kommer att avboka den åt dig."
  },
  no: {
    customer: "Jeg vil avbestille min avtale",
    ai: "Jeg ser at du har en avtale neste tirsdag kl. 14:00. Jeg vil avbestille den for deg."
  },
  da: {
    customer: "Jeg vil afbestille min aftale",
    ai: "Jeg kan se, at du har en aftale næste tirsdag kl. 14:00. Jeg vil afbestille den for dig."
  },
  fi: {
    customer: "Haluan peruuttaa aikani",
    ai: "Näen, että sinulla on aika ensi tiistaina klo 14:00. Peruutan sen sinulle."
  },
  cs: {
    customer: "Chci zrušit svou schůzku",
    ai: "Vidím, že máte schůzku příští úterý ve 14:00. Zruším ji za vás."
  },
  sk: {
    customer: "Chcem zrušiť svoju schôdzku",
    ai: "Vidím, že máte schôdzku budúci utorok o 14:00. Zruším ju za vás."
  },
  hu: {
    customer: "Szeretném lemondani az időpontomat",
    ai: "Látom, hogy jövő kedden 14:00-kor van időpontja. Lemondhatom önnek."
  },
  ro: {
    customer: "Vreau să îmi anulez programarea",
    ai: "Văd că aveți o programare marți viitoare la ora 14:00. O voi anula pentru dumneavoastră."
  },
  bg: {
    customer: "Искам да отменя часа си",
    ai: "Виждам, че имате час в следващия вторник в 14:00. Ще го отменя за вас."
  },
  hr: {
    customer: "Želim otkazati svoj termin",
    ai: "Vidim da imate termin sljedećeg utorka u 14:00. Otkazat ću ga za vas."
  },
  sr: {
    customer: "Желим да откажем свој термин",
    ai: "Видим да имате термин следећег уторка у 14:00. Отказаћу га за вас."
  },
  el: {
    customer: "Θέλω να ακυρώσω το ραντεβού μου",
    ai: "Βλέπω ότι έχετε ραντεβού την επόμενη Τρίτη στις 14:00. Θα το ακυρώσω για εσάς."
  },
  he: {
    customer: "אני רוצה לבטל את התור שלי",
    ai: "אני רואה שיש לך תור ביום שלישי הבא בשעה 14:00. אבטל אותו עבורך."
  },
  fa: {
    customer: "می‌خواهم قرار ملاقاتم را لغو کنم",
    ai: "می‌بینم که شما یک قرار ملاقات سه‌شنبه آینده ساعت 14:00 دارید. آن را برایتان لغو می‌کنم."
  },
  ur: {
    customer: "میں اپنی اپائنٹمنٹ منسوخ کرنا چاہتا ہوں",
    ai: "میں دیکھ رہا ہوں کہ آپ کی اگلے منگل دوپہر 2 بجے اپائنٹمنٹ ہے۔ میں اسے آپ کے لیے منسوخ کر دوں گا۔"
  },
  bn: {
    customer: "আমি আমার অ্যাপয়েন্টমেন্ট বাতিল করতে চাই",
    ai: "আমি দেখছি আপনার পরের মঙ্গলবার দুপুর ২টায় অ্যাপয়েন্টমেন্ট আছে। আমি এটা আপনার জন্য বাতিল করব।"
  },
  ta: {
    customer: "நான் என் சந்திப்பை ரத்து செய்ய விரும்புகிறேன்",
    ai: "அடுத்த செவ்வாய் மதியம் 2 மணிக்கு உங்கள் சந்திப்பு உள்ளது என்று பார்க்கிறேன். நான் அதை உங்களுக்காக ரத்து செய்கிறேன்."
  },
  te: {
    customer: "నేను నా అపాయింట్‌మెంట్‌ను రద్దు చేయాలనుకుంటున్నాను",
    ai: "వచ్చే మంగళవారం మధ్యాహ్నం 2 గంటలకు మీ అపాయింట్‌మెంట్ ఉందని చూస్తున్నాను. దాన్ని మీ కోసం రద్దు చేస్తాను."
  },
  ml: {
    customer: "എനിക്ക് എന്റെ അപ്പോയിന്റ്മെന്റ് റദ്ദാക്കണം",
    ai: "അടുത്ത ചൊവ്വാഴ്ച ഉച്ചകഴിഞ്ഞ് 2 മണിക്ക് നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് ഉണ്ടെന്ന് കാണുന്നു. ഞാൻ അത് നിങ്ങൾക്കായി റദ്ദാക്കാം."
  },
  kn: {
    customer: "ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ರದ್ದುಮಾಡಲು ಬಯಸುತ್ತೇನೆ",
    ai: "ಮುಂದಿನ ಮಂಗಳವಾರ ಮಧ್ಯಾಹ್ನ 2 ಗಂಟೆಗೆ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಇದೆ ಎಂದು ನೋಡುತ್ತೇನೆ. ನಾನು ಅದನ್ನು ನಿಮಗಾಗಿ ರದ್ದುಮಾಡುತ್ತೇನೆ."
  },
  gu: {
    customer: "હું મારી અપોઇન્ટમેન્ટ રદ કરવા માંગુ છું",
    ai: "હું જોઉં છું કે આવતા મંગળવારે બપોરે 2 વાગ્યે તમારી અપોઇન્ટમેન્ટ છે. હું તમારા માટે તેને રદ કરીશ."
  },
  pa: {
    customer: "ਮੈਂ ਆਪਣੀ ਮੁਲਾਕਾਤ ਰੱਦ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ",
    ai: "ਮੈਂ ਦੇਖ ਰਿਹਾ ਹਾਂ ਕਿ ਅਗਲੇ ਮੰਗਲਵਾਰ ਦੁਪਹਿਰ 2 ਵਜੇ ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ ਹੈ। ਮੈਂ ਇਸਨੂੰ ਤੁਹਾਡੇ ਲਈ ਰੱਦ ਕਰ ਦੁੰਗਾ।"
  },
  mr: {
    customer: "मला माझी अपॉइंटमेंट रद्द करायची आहे",
    ai: "मी पाहतो की पुढच्या मंगळवारी दुपारी 2 वाजता तुमची अपॉइंटमेंट आहे. मी ती तुमच्यासाठी रद्द करीन."
  },
  ne: {
    customer: "म मेरो अपोइन्टमेन्ट रद्द गर्न चाहन्छु",
    ai: "म देख्छु कि तपाईंको अर्को मंगलबार दिउँसो २ बजे अपोइन्टमेन्ट छ। म यसलाई तपाईंको लागि रद्द गर्नेछु।"
  },
  si: {
    customer: "මට මගේ නියමුව අවලංගු කරන්න ඕනෑ",
    ai: "ලබන අඟහරුවාදා දවල් 2ට ඔබේ නියමුවක් ඇති බව මම දකිනවා. මම එය ඔබ වෙනුවෙන් අවලංගු කරන්නම්."
  },
  my: {
    customer: "ကျွန်တော် ကျွန်တော့်ရဲ့ ချိန်းဆိုမှုကို ပယ်ဖျက်ချင်ပါတယ်",
    ai: "နောက်အင်္ဂါနေ့ မွန်းလွဲ ၂ နာရီမှာ သင့်ရဲ့ ချိန်းဆိုမှု ရှိတာ မြင်ပါတယ်။ ကျွန်တော် သင့်အတွက် ပယ်ဖျက်ပေးပါမယ်။"
  },
  km: {
    customer: "ខ្ញុំចង់លុបចោលការណាត់ជួបរបស់ខ្ញុំ",
    ai: "ខ្ញុំឃើញថាលោកអ្នកមានការណាត់ជួបនៅថ្ងៃអង្គារបន្ទាប់ម៉ោង ២ រសៀល។ ខ្ញុំនឹងលុបចោលវាសម្រាប់លោកអ្នក។"
  },
  lo: {
    customer: "ຂ້ອຍຕ້ອງການຍົກເລີກການນັດຫມາຍຂອງຂ້ອຍ",
    ai: "ຂ້ອຍເຫັນວ່າທ່ານມີການນັດຫມາຍໃນວັນອັງຄານຫນ້າເວລາ 2 ໂມງແລງ. ຂ້ອຍຈະຍົກເລີກມັນໃຫ້ທ່ານ."
  },
  ka: {
    customer: "მინდა გავაუქმო ჩემი ვიზიტი",
    ai: "ვხედავ, რომ შემდეგ სამშაბათს გაქვთ ვიზიტი 14:00-ზე. გავაუქმებ მას თქვენთვის."
  },
  am: {
    customer: "ቀጠሮዬን መሰረዝ እፈልጋለሁ",
    ai: "በሚቀጥለው ማክሰኞ ከቀትር 2 ሰዓት ቀጠሮ እንዳለዎት አይቻለሁ። ለእርስዎ አሰርዘዋለሁ።"
  },
  sw: {
    customer: "Nataka kughairi miadi yangu",
    ai: "Naona una miadi Jumanne ijayo saa 8 mchana. Nitaighairi kwa ajili yako."
  },
  ha: {
    customer: "Ina son in soke jadawalina",
    ai: "Na ga kana da jadawali ranar Talata mai zuwa da karfe 2 na rana. Zan soke maka."
  },
  yo: {
    customer: "Mo fẹ fagilee ipade mi",
    ai: "Mo rii pe o ni ipade ni Ọjọ Tuesday to nbọ ni agogo meji ọsan. Emi yoo fagilee fun ọ."
  },
  ig: {
    customer: "Achọrọ m ikagbu oge nzukọ m",
    ai: "Ahụrụ m na ị nwere oge nzukọ na Tuuzdee na-abịa n'elekere abụọ ehihie. Aga m ikagbu ya maka gị."
  },
  zu: {
    customer: "Ngifuna ukukhansela umhlangano wami",
    ai: "Ngibona ukuthi unomhlangano ngoLwesibili ozayo ngo-2 ntambama. Ngizowukhansela ngakho."
  },
  af: {
    customer: "Ek wil my afspraak kanselleer",
    ai: "Ek sien jy het 'n afspraak volgende Dinsdag om 14:00. Ek sal dit vir jou kanselleer."
  },
  sq: {
    customer: "Dua të anuloj takimin tim",
    ai: "Shoh që keni një takim të martën e ardhshme në orën 14:00. Do ta anuloj për ju."
  },
  eu: {
    customer: "Nire hitzordua ezeztatu nahi dut",
    ai: "Hurrengo asteartean 14:00etan hitzordua duzula ikusten dut. Zure aldean ezeztatuko dut."
  },
  be: {
    customer: "Я хачу адмяніць сваю сустрэчу",
    ai: "Я бачу, што ў вас ёсць сустрэча ў наступную аўторак у 14:00. Я адменю яе для вас."
  },
  bs: {
    customer: "Želim otkazati svoj termin",
    ai: "Vidim da imate termin sljedeći utorak u 14:00. Otkazat ću ga za vas."
  },
  ca: {
    customer: "Vull cancel·lar la meva cita",
    ai: "Veig que tens una cita el dimarts vinent a les 14:00. La cancel·laré per tu."
  },
  et: {
    customer: "Tahan oma kohtumist tühistada",
    ai: "Näen, et teil on kohtumine järgmisel teisipäeval kell 14:00. Tühistan selle teie eest."
  },
  is: {
    customer: "Ég vil afpanta tímann minn",
    ai: "Ég sé að þú ert með tíma næsta þriðjudag klukkan 14:00. Ég mun afpanta hann fyrir þig."
  },
  ga: {
    customer: "Ba mhaith liom mo choinne a chealú",
    ai: "Feicim go bhfuil coinne agat Dé Máirt seo chugainn ag 2 i.n. Cealaím é duit."
  },
  lv: {
    customer: "Es vēlos atcelt savu tikšanos",
    ai: "Es redzu, ka jums ir tikšanās nākamo otrdienu plkst. 14:00. Es to atcelšu jūsu vietā."
  },
  lt: {
    customer: "Noriu atšaukti savo susitikimą",
    ai: "Matau, kad turite susitikimą kitą antradienį 14:00. Aš jį atšauksiu jums."
  },
  mk: {
    customer: "Сакам да го откажам мојот термин",
    ai: "Видам дека имате термин следниот вторник во 14:00. Ќе го откажам за вас."
  },
  mt: {
    customer: "Irrid nikkanċella l-appuntament tiegħi",
    ai: "Nara li għandek appuntament it-Tlieta d-dieħla fil-2pm. Se nikkanċellah għalik."
  },
  mn: {
    customer: "Би өөрийн уулзалтыг цуцлахыг хүсч байна",
    ai: "Таныг ирэх мягмар гарагт 14:00 цагт уулзалт байгааг би харж байна. Би танд үүнийг цуцлах болно."
  },
  sl: {
    customer: "Želim preklicati svoj termin",
    ai: "Vidim, da imate termin naslednji torek ob 14:00. Preklical ga bom za vas."
  },
  uk: {
    customer: "Я хочу скасувати своє призначення",
    ai: "Я бачу, що у вас є призначення наступного вівторка о 14:00. Я скасую його для вас."
  },
  cy: {
    customer: "Rwyf eisiau canslo fy apwyntiad",
    ai: "Rwy'n gweld bod gennych apwyntiad ddydd Mawrth nesaf am 2pm. Byddaf yn ei ganslo i chi."
  }
};

interface SearchableSelectProps {
  languages: typeof languages;
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
}

function SearchableSelect({ languages, selectedLanguage, onLanguageChange }: SearchableSelectProps) {
  const { t } = useTranslation('home');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);

  const updateButtonPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isOpen) {
      updateButtonPosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    function handleResize() {
      if (isOpen && buttonRef.current) {
        updateButtonPosition();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

  const handleSelect = (langCode: string) => {
    onLanguageChange(langCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 h-8 bg-slate-700/50 border border-slate-600 rounded-md text-white text-xs hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 relative z-10"
      >
        <span className="flex items-center gap-2">
          <span>{selectedLang?.flag}</span>
          <span>{selectedLang?.name}</span>
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="bg-slate-800 border border-slate-700 rounded-md shadow-lg animate-fade-in"
          style={{
            position: 'fixed',
            top: `${buttonPosition.top + 4}px`,
            left: `${buttonPosition.left}px`,
            width: `${buttonPosition.width}px`,
            zIndex: 9999,
            maxHeight: '256px',
            overflow: 'hidden'
          }}
        >
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
              <Input
                type="text"
                placeholder={t('bento.multiLanguage.searchPlaceholder', 'Search languages...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-7 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-700 focus:bg-slate-700 focus:outline-none transition-colors ${
                    selectedLanguage === lang.code ? 'bg-slate-700 text-emerald-400' : 'text-white'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                {t('bento.multiLanguage.noResults', 'No languages found')}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function TranslationDemo() {
  const { t } = useTranslation('home');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(selectedLanguage);
  const messages = chatMessages[selectedLanguage as keyof typeof chatMessages] || chatMessages.en;

  return (
    <div className="absolute inset-3">
      {/* Badge */}
      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
        {t('bento.multiLanguage.badge', '200+ Languages')}
      </div>

      <div className="h-full flex flex-col">
        {/* Language Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-slate-300 font-medium">{t('bento.multiLanguage.selectLabel', 'Select customer language:')}</label>
          <SearchableSelect
            languages={languages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>

        {/* Chat Demo */}
        <div className="flex-1 space-y-3">
          {/* Customer Message */}
          <div className="flex justify-start">
            <div 
              className={`max-w-[80%] bg-slate-600/50 text-white text-xs px-3 py-2 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {messages.customer}
            </div>
          </div>

          {/* AI Response */}
          <div className="flex justify-end">
            <div 
              className={`max-w-[80%] bg-emerald-600/80 text-white text-xs px-3 py-2 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {messages.ai}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
