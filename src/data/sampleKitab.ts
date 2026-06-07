/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KitabProject } from "../types";

export const sampleKitabProject: KitabProject = {
  id: "proj-ajurrumiyyah-kalam",
  title: "Al-Ajurrumiyyah (Bab Al-Kalam)",
  author: "Syekh Abu Abdillah Sidi Muhammad bin Daud Ash-Shanhaji",
  description: "Kitab gramatika bahasa Arab (ilmu Nahwu) dasar untuk santri pemula. Bab pertama menjelaskan definisi Kalam dan unsur pembentuk kalimat.",
  dateCreated: "2026-06-07T02:00:00Z",
  dateModified: "2026-06-07T02:30:00Z",
  chapters: [
    {
      id: "ch-1",
      title: "BAB AL-KALAM (بَابُ الْكَلَامِ)",
      order: 1,
      sections: [
        {
          id: "sec-1",
          title: "Definisi Kalam (تَعْرِيفُ الْكَلَامِ)",
          order: 1,
          lines: [
            {
              id: "line-1",
              arabicFull: "الْكَلَامُ هُوَ اللَّفْظُ الْمُرَكَّبُ الْمُفِيدُ بِالْوَضْعِ",
              translationFull: "Kalam (kalimat sempurna) adalah lafal yang tersusun, berfaedah (dipahami pendengar), dan disengaja dalam tata bahasa Arab.",
              notes: "Kalam secara bahasa berarti ucapan. Menurut ahli Nahwu, ucapan dihukumi kalam apabila memenuhi empat kriteria: Lafal, Murakkab (susunan kata), Mufid (faedah sempurna), dan Bil-Wadl'i (sengaja dengan pola Arab).",
              matan: "الْكَلَامُ هُوَ اللَّفْظُ الْمُرَكَّبُ الْمُفِيدُ بِالْوَضْعِ",
              syarah: "Lafal 'Al-Kalam' (الكلام) di sini bermakna pembicaraan lisan yang memberikan faedah utuh. Syarah Syekh Muhammad Al-Ahdab menjelaskan bahwa kata harus berupa suara yang mengandung sebagian huruf hijaiyah agar sah disebut kalam.",
              hasyiyah: "Hasyiyah Al-Qalyubi menjelaskan rahasia pendefinisian mushannif menggunakan dhomir munfashil 'huwa' (هو) sebagai pembatas untuk menegaskan hakikat Kalam secara gramatikal murni.",
              taliq: "Catatan korektor naskah: Terdapat variasi di beberapa naskah naskah Syam tertua yang menyisipkan lafal 'bil-wadl'i' di bagian akhir.",
              words: [
                { id: "w-1-1", arabic: "الْكَلَامُ", makna: "utawi kalam", symbol: "م" },
                { id: "w-1-2", arabic: "هُوَ", makna: "iya kalam", symbol: "ض" },
                { id: "w-1-3", arabic: "اللَّفْظُ", makna: "iku lafadz", symbol: "خ" },
                { id: "w-1-4", arabic: "الْمُرَكَّبُ", makna: "kang disusun", symbol: "ص" },
                { id: "w-1-5", arabic: "الْمُفِيدُ", makna: "kang menehi faedah", symbol: "ص" },
                { id: "w-1-6", arabic: "بِالْوَضْعِ", makna: "kelawan sengaja", symbol: "ع" }
              ]
            },
            {
              id: "line-2",
              arabicFull: "وَأَقْسَامُهُ ثَلَاثَةٌ: اسْمٌ، وَفِعْلٌ، وَحَرْفٌ جَاءَ لِمَعْنًى",
              translationFull: "Dan pembagian Kalam itu ada tiga: Isim (Kata Benda), Fi'il (Kata Kerja), dan Huruf yang mendatangkan arti.",
              notes: "Pembagi terkecil kalimat terdiri dari unsur nama/benda (Isim), unsur aktivitas (Fi'il), dan huruf pasif (Harf) yang hanya bermakna jika dihubungkan dengan kata lain.",
              matan: "وَأَقْسَامُهُ ثَلَاثَةٌ: اسْمٌ، وَفِعْلٌ، وَحَرْفٌ جَاءَ لِمَعْنًى",
              syarah: "Pembagian unsur kalimat menjadi tiga bagian (Isim, Fi'il, Huruf) didasarkan atas penelitian induktif (Istiqra') mendalam para ahli bahasa terhadap struktur ujaran Arab murni.",
              hasyiyah: "Al-Bujairimi memberi catatan kaki bahwa pembatasan pada tiga unsur ini disepakati oleh seluruh ulama Basrah dan Kufah tanpa terkecuali.",
              taliq: "Klausa 'ja'a li-ma'nan' ditambahkan untuk mengecualikan huruf ejaan (Huruf Hijaiyah pembangun kata) seperti 'Jim' atau 'Dal' yang berdiri sendiri.",
              words: [
                { id: "w-2-1", arabic: "وَأَقْسَامُهُ", makna: "lan utawi bagian-bagian kalam", symbol: "م" },
                { id: "w-2-2", arabic: "ثَلَاثَةٌ", makna: "iku telu", symbol: "خ" },
                { id: "w-2-3", arabic: "اسْمٌ", makna: "siji Isim", symbol: "بد" },
                { id: "w-2-4", arabic: "وَفِعْلٌ", makna: "lan kaping pindho Fi'il", symbol: "ع" },
                { id: "w-2-5", arabic: "وَحَرْفٌ", makna: "lan kaping telu Huruf", symbol: "ع" },
                { id: "w-2-6", arabic: "جَاءَ", makna: "kang teko opo huruf", symbol: "ص" },
                { id: "w-2-7", arabic: "لِمَعْنًى", makna: "kerono menehi makna", symbol: "ع" }
              ]
            }
          ]
        },
        {
          id: "sec-2",
          title: "Tanda-Tanda Kalimat Isim (عَلَامَاتُ الْإِسْمِ)",
          order: 2,
          lines: [
            {
              id: "line-3",
              arabicFull: "فَالإِسْمُ يُعْرَفُ بِالْخَفْضِ وَالتَّنْوِينِ وَدُخُولِ الأَلِفِ وَاللَّامِ",
              translationFull: "Maka kalimat Isim (Kata Benda) itu dapat dikenali dengan keadaan Khafadh (Kasrah), tersisip Tanwin, dan masuknya Alif-Lam (ال).",
              notes: "Kemampuan mengenali Isim dilatih dengan melihat pola harakat kasrah di akhir kalimat karena didahului huruf jar, adanya tanwin, maupun awalan Alif Lam.",
              matan: "فَالإِسْمُ يُعْرَفُ بِالْخَفْضِ وَالتَّنْوِينِ وَدُخُولِ الأَلِفِ وَاللَّامِ",
              syarah: "Tanda pertama isim yang disebutkan mushannif adalah Khafadh (atau Jar menurut peristilahan ulama Bashrah). Istilah Khafadh lazim dipakai oleh madzhab Kufah dan diadopsi dalam kitab Al-Jurrumiyyah ini.",
              hasyiyah: "Hasyiyah Al-Dimyathi menekankan bahwa amil penjer ada tiga macam: bil-harfi (dengan huruf), bil-idhafah (dengan penyandaran), dan bit-taba'iyyah (karena pengikutan i'rab).",
              taliq: "Penyebutan tanda Khafadh didahulukan karena ia merupakan tanda i'rab terkuat yang khusus melekat pada ragam Isim saja.",
              words: [
                { id: "w-3-1", arabic: "فَالإِسْمُ", makna: "moko utawi isim", symbol: "م" },
                { id: "w-3-2", arabic: "يُعْرَفُ", makna: "iku dikanal opo isim", symbol: "خ" },
                { id: "w-3-3", arabic: "بِالْخَفْضِ", makna: "kelawan jar/kemasukan khofadh", symbol: "ع" },
                { id: "w-3-4", arabic: "وَالتَّنْوِينِ", makna: "lan kemasukan tanwin", symbol: "ع" },
                { id: "w-3-5", arabic: "وَدُخُولِ", makna: "lan kemasukan", symbol: "ع" },
                { id: "w-3-6", arabic: "الأَلِفِ", makna: "alif", symbol: "مض" },
                { id: "w-3-7", arabic: "وَاللَّامِ", makna: "lan lam", symbol: "ع" }
              ]
            }
          ]
        }
      ]
    }
  ]
};
