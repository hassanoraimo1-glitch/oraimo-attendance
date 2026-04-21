// ═══════════════════════════════════════════════════════════
// core/data.js — Static data for the app
// ─────────────────────────────────────────────────────────
// Contents:
//   - BRANCH_DATA   : live revenue/qty/tier per branch
//   - PRODUCTS      : catalogue with EGP prices
//   - MANAGERS      : team leader names (manager_teams FK)
//   - Q1_STORES     : Jan/Feb/Mar historical snapshot (reports)
//   - ORAIMO_SPECS  : model database w/ specs + selling points
//   - MARCH_*       : snapshot constants used by analytics
// ═══════════════════════════════════════════════════════════

// ── BRANCH DATA (Excel 11-04-2026) ──
const BRANCH_DATA=[{"name":"B.ONLINE","revenue":107911,"prev_revenue":293938,"qty":115,"prev_qty":281,"stock":0,"tier":"S"},{"name":"NEW IMBABA","revenue":79338,"prev_revenue":142122,"qty":69,"prev_qty":133,"stock":194,"tier":"S"},{"name":"ElSoudan Street","revenue":54277,"prev_revenue":83046,"qty":48,"prev_qty":80,"stock":154,"tier":"S"},{"name":"V_Hassan El Maamon","revenue":52883,"prev_revenue":60537,"qty":60,"prev_qty":77,"stock":274,"tier":"S"},{"name":"El Zaher","revenue":44118,"prev_revenue":86811,"qty":37,"prev_qty":75,"stock":144,"tier":"S"},{"name":"Qena","revenue":41988,"prev_revenue":121171,"qty":35,"prev_qty":104,"stock":196,"tier":"S"},{"name":"Qalyub","revenue":39661,"prev_revenue":65373,"qty":34,"prev_qty":59,"stock":112,"tier":"S"},{"name":"Dar El Salam","revenue":38388,"prev_revenue":80582,"qty":41,"prev_qty":73,"stock":216,"tier":"S"},{"name":"El Helmya","revenue":37760,"prev_revenue":76910,"qty":34,"prev_qty":72,"stock":66,"tier":"S"},{"name":"Maadi2","revenue":36598,"prev_revenue":61324,"qty":34,"prev_qty":58,"stock":162,"tier":"S"},{"name":"Banha_Mega_Store","revenue":36166,"prev_revenue":140103,"qty":41,"prev_qty":122,"stock":50,"tier":"S"},{"name":"El kanater","revenue":33847,"prev_revenue":141643,"qty":34,"prev_qty":137,"stock":172,"tier":"S"},{"name":"26th July","revenue":32036,"prev_revenue":107472,"qty":34,"prev_qty":94,"stock":116,"tier":"S"},{"name":"P_Sky Mall El Sherouk","revenue":29149,"prev_revenue":42060,"qty":25,"prev_qty":40,"stock":154,"tier":"S"},{"name":"P_Mall Of October","revenue":28749,"prev_revenue":56409,"qty":22,"prev_qty":61,"stock":82,"tier":"S"},{"name":"Ain Shams","revenue":28565,"prev_revenue":23558,"qty":26,"prev_qty":20,"stock":410,"tier":"S"},{"name":"P_Mega Helwan","revenue":27805,"prev_revenue":52923,"qty":28,"prev_qty":55,"stock":102,"tier":"S"},{"name":"V_City Center Maadi","revenue":27463,"prev_revenue":30186,"qty":23,"prev_qty":27,"stock":184,"tier":"S"},{"name":"V_City Stars Mall","revenue":23540,"prev_revenue":4303,"qty":18,"prev_qty":4,"stock":124,"tier":"S"},{"name":"Oraby","revenue":23422,"prev_revenue":93358,"qty":22,"prev_qty":89,"stock":124,"tier":"S"},{"name":"HQ Call Center stop","revenue":23094,"prev_revenue":70437,"qty":23,"prev_qty":55,"stock":0,"tier":"S"},{"name":"V_El Tahrir","revenue":22459,"prev_revenue":58299,"qty":20,"prev_qty":47,"stock":168,"tier":"S"},{"name":"P_Town Center El Salam","revenue":20885,"prev_revenue":44154,"qty":23,"prev_qty":66,"stock":296,"tier":"S"},{"name":"2Ain Shams","revenue":20685,"prev_revenue":39213,"qty":24,"prev_qty":44,"stock":632,"tier":"S"},{"name":"AKKAD","revenue":20370,"prev_revenue":35607,"qty":20,"prev_qty":38,"stock":396,"tier":"S"},{"name":"V_Maadi Grand Mall","revenue":18983,"prev_revenue":29601,"qty":21,"prev_qty":39,"stock":276,"tier":"S"},{"name":"V_Gesr El Suez","revenue":18272,"prev_revenue":37695,"qty":14,"prev_qty":37,"stock":102,"tier":"S"},{"name":"V_Zayton","revenue":17648,"prev_revenue":3804,"qty":22,"prev_qty":7,"stock":76,"tier":"S"},{"name":"V_Badr","revenue":17519,"prev_revenue":106158,"qty":17,"prev_qty":91,"stock":210,"tier":"S"},{"name":"Shobra","revenue":17342,"prev_revenue":108644,"qty":15,"prev_qty":102,"stock":80,"tier":"S"},{"name":"Faisal","revenue":17262,"prev_revenue":53315,"qty":18,"prev_qty":59,"stock":150,"tier":"S"},{"name":"V_Dokki","revenue":16291,"prev_revenue":31647,"qty":13,"prev_qty":31,"stock":158,"tier":"S"},{"name":"V_El Sherouk","revenue":15999,"prev_revenue":26522,"qty":15,"prev_qty":22,"stock":110,"tier":"S"},{"name":"Misr Al Gadida","revenue":14425,"prev_revenue":23047,"qty":10,"prev_qty":27,"stock":272,"tier":"S"},{"name":"V_ElSayeda Zainab","revenue":13550,"prev_revenue":8846,"qty":18,"prev_qty":9,"stock":110,"tier":"S"},{"name":"Delta_Berket_ElSabaa","revenue":12791,"prev_revenue":32553,"qty":10,"prev_qty":25,"stock":16,"tier":"S"},{"name":"V_Bani Suef","revenue":12227,"prev_revenue":41077,"qty":13,"prev_qty":41,"stock":18,"tier":"S"},{"name":"BTECH mini Dandy Mall","revenue":11634,"prev_revenue":8614,"qty":6,"prev_qty":8,"stock":40,"tier":"S"},{"name":"P_Almaza","revenue":11043,"prev_revenue":13607,"qty":12,"prev_qty":12,"stock":656,"tier":"S"},{"name":"BTECH mini Ramses Station","revenue":10876,"prev_revenue":11517,"qty":11,"prev_qty":12,"stock":120,"tier":"S"},{"name":"V_Sheraton","revenue":10294,"prev_revenue":12165,"qty":15,"prev_qty":15,"stock":110,"tier":"S"},{"name":"P_GateWay Mall El Rehab","revenue":10003,"prev_revenue":14778,"qty":10,"prev_qty":14,"stock":108,"tier":"S"},{"name":"New Sohag","revenue":9542,"prev_revenue":28633,"qty":9,"prev_qty":28,"stock":32,"tier":"S"},{"name":"P_Mall OF Egypt","revenue":8606,"prev_revenue":36318,"qty":14,"prev_qty":43,"stock":204,"tier":"S"},{"name":"V_Sidi Bishr","revenue":8501,"prev_revenue":7781,"qty":8,"prev_qty":10,"stock":22,"tier":"S"},{"name":"V_ElRehab Mall1","revenue":8257,"prev_revenue":13138,"qty":7,"prev_qty":16,"stock":106,"tier":"A"},{"name":"P_Mega Shubra El Kheima","revenue":7794,"prev_revenue":30783,"qty":6,"prev_qty":34,"stock":156,"tier":"A"},{"name":"Ismailia","revenue":7678,"prev_revenue":8906,"qty":6,"prev_qty":10,"stock":110,"tier":"A"},{"name":"V_Mataria","revenue":7221,"prev_revenue":5293,"qty":5,"prev_qty":6,"stock":22,"tier":"A"},{"name":"V_AUC","revenue":6981,"prev_revenue":14309,"qty":7,"prev_qty":14,"stock":130,"tier":"A"},{"name":"V_Elmenia","revenue":6866,"prev_revenue":25034,"qty":8,"prev_qty":24,"stock":40,"tier":"A"},{"name":"V_Ismailia Square","revenue":6655,"prev_revenue":26440,"qty":8,"prev_qty":23,"stock":116,"tier":"A"},{"name":"P_Uni Mall El Obour","revenue":6571,"prev_revenue":11633,"qty":6,"prev_qty":11,"stock":146,"tier":"A"},{"name":"Delta_Dakernis","revenue":6510,"prev_revenue":14415,"qty":7,"prev_qty":15,"stock":10,"tier":"A"},{"name":"Makram Ebaid","revenue":6464,"prev_revenue":14075,"qty":7,"prev_qty":19,"stock":304,"tier":"A"},{"name":"New Domyat","revenue":6402,"prev_revenue":29787,"qty":8,"prev_qty":32,"stock":26,"tier":"A"},{"name":"P_District 5","revenue":6395,"prev_revenue":7392,"qty":6,"prev_qty":7,"stock":4,"tier":"A"},{"name":"V_Obour2","revenue":5937,"prev_revenue":31425,"qty":6,"prev_qty":24,"stock":144,"tier":"A"},{"name":"V_Gardenia Tagamo","revenue":5931,"prev_revenue":13434,"qty":5,"prev_qty":10,"stock":100,"tier":"A"},{"name":"V_The Gate Zayed","revenue":5586,"prev_revenue":4943,"qty":4,"prev_qty":5,"stock":4,"tier":"A"},{"name":"BTECH mini  Kafr El Dawaar","revenue":5468,"prev_revenue":9892,"qty":5,"prev_qty":10,"stock":0,"tier":"A"},{"name":"V_Open Air Mall","revenue":5355,"prev_revenue":2095,"qty":8,"prev_qty":1,"stock":126,"tier":"A"},{"name":"V_El Amiria","revenue":4884,"prev_revenue":3369,"qty":3,"prev_qty":3,"stock":12,"tier":"A"},{"name":"Haram","revenue":4774,"prev_revenue":6348,"qty":4,"prev_qty":8,"stock":214,"tier":"A"},{"name":"Zahra El Asher","revenue":4539,"prev_revenue":13261,"qty":3,"prev_qty":14,"stock":52,"tier":"A"},{"name":"V_ElBahr ElAzam","revenue":4531,"prev_revenue":1744,"qty":3,"prev_qty":2,"stock":8,"tier":"A"},{"name":"MEGA ElDahar","revenue":4416,"prev_revenue":13615,"qty":6,"prev_qty":14,"stock":84,"tier":"A"},{"name":"El Menia Mega Store","revenue":4303,"prev_revenue":31887,"qty":4,"prev_qty":30,"stock":22,"tier":"A"},{"name":"Fakous","revenue":4189,"prev_revenue":39927,"qty":4,"prev_qty":40,"stock":4,"tier":"A"},{"name":"V_Roxcy","revenue":4128,"prev_revenue":11462,"qty":6,"prev_qty":12,"stock":220,"tier":"A"},{"name":"Delta Ismalia 2","revenue":3841,"prev_revenue":3257,"qty":3,"prev_qty":3,"stock":100,"tier":"A"},{"name":"Nagaa Hamadi Mega Store","revenue":3836,"prev_revenue":3140,"qty":4,"prev_qty":4,"stock":16,"tier":"A"},{"name":"Mall Of Arabia","revenue":3726,"prev_revenue":28912,"qty":3,"prev_qty":27,"stock":42,"tier":"A"},{"name":"Faiyoum 2","revenue":3726,"prev_revenue":584,"qty":3,"prev_qty":1,"stock":8,"tier":"A"},{"name":"V_45","revenue":3495,"prev_revenue":7091,"qty":3,"prev_qty":8,"stock":0,"tier":"A"},{"name":"El Faiyum","revenue":3376,"prev_revenue":4135,"qty":3,"prev_qty":4,"stock":8,"tier":"A"},{"name":"Elagamy2","revenue":3376,"prev_revenue":3085,"qty":3,"prev_qty":4,"stock":20,"tier":"A"},{"name":"Assuit_Mega_Store","revenue":3372,"prev_revenue":7798,"qty":2,"prev_qty":8,"stock":58,"tier":"A"},{"name":"V_Al Zamalek","revenue":3259,"prev_revenue":11723,"qty":4,"prev_qty":14,"stock":110,"tier":"A"},{"name":"V_Sohag","revenue":3201,"prev_revenue":13500,"qty":4,"prev_qty":16,"stock":10,"tier":"A"},{"name":"P_El Tagamo Mega Store 1","revenue":3199,"prev_revenue":1945,"qty":4,"prev_qty":3,"stock":92,"tier":"A"},{"name":"Delta_Quesna","revenue":3138,"prev_revenue":12552,"qty":3,"prev_qty":12,"stock":2,"tier":"A"},{"name":"Domyat","revenue":3028,"prev_revenue":35137,"qty":3,"prev_qty":31,"stock":4,"tier":"A"},{"name":"Partner Truck 2","revenue":2796,"prev_revenue":0,"qty":3,"prev_qty":0,"stock":6,"tier":"A"},{"name":"El Galaa","revenue":2793,"prev_revenue":10128,"qty":2,"prev_qty":9,"stock":10,"tier":"A"},{"name":"V_Kafr El Zayat","revenue":2790,"prev_revenue":16750,"qty":3,"prev_qty":16,"stock":8,"tier":"A"},{"name":"Hadayek","revenue":2382,"prev_revenue":2848,"qty":3,"prev_qty":4,"stock":26,"tier":"A"},{"name":"Alex_Smouha","revenue":2330,"prev_revenue":9686,"qty":2,"prev_qty":11,"stock":26,"tier":"A"},{"name":"BTECH mini  Shebin El koum","revenue":2330,"prev_revenue":1165,"qty":2,"prev_qty":1,"stock":4,"tier":"A"},{"name":"V_Alex_ Tusun","revenue":2330,"prev_revenue":5993,"qty":2,"prev_qty":6,"stock":8,"tier":"A"},{"name":"V_El Rehab North","revenue":2326,"prev_revenue":8446,"qty":4,"prev_qty":9,"stock":72,"tier":"B"},{"name":"P_El Tagamo Mega Store 2","revenue":2211,"prev_revenue":10763,"qty":2,"prev_qty":9,"stock":102,"tier":"B"},{"name":"V_Zagazig","revenue":2211,"prev_revenue":7560,"qty":2,"prev_qty":7,"stock":18,"tier":"B"},{"name":"Zagazig_Mega_Store","revenue":2211,"prev_revenue":8262,"qty":2,"prev_qty":7,"stock":120,"tier":"B"},{"name":"BTECH Mini Air Force House","revenue":2209,"prev_revenue":0,"qty":1,"prev_qty":0,"stock":4,"tier":"B"},{"name":"New Damanhour","revenue":2094,"prev_revenue":16633,"qty":3,"prev_qty":15,"stock":16,"tier":"B"},{"name":"Mansoura","revenue":2092,"prev_revenue":1165,"qty":2,"prev_qty":1,"stock":0,"tier":"B"},{"name":"P_Tanta Mall","revenue":2092,"prev_revenue":5230,"qty":2,"prev_qty":5,"stock":2,"tier":"B"},{"name":"V_Assuit","revenue":2092,"prev_revenue":11523,"qty":2,"prev_qty":12,"stock":20,"tier":"B"},{"name":"V_Mahala","revenue":2092,"prev_revenue":4537,"qty":2,"prev_qty":5,"stock":0,"tier":"B"},{"name":"P_Delta Tanta Mega Store","revenue":1976,"prev_revenue":6276,"qty":2,"prev_qty":6,"stock":18,"tier":"B"},{"name":"V_El Mosher Axis","revenue":1895,"prev_revenue":0,"qty":2,"prev_qty":0,"stock":86,"tier":"B"},{"name":"New Roxy","revenue":1835,"prev_revenue":18878,"qty":6,"prev_qty":24,"stock":152,"tier":"B"},{"name":"BTECH mini ElShams Club","revenue":1744,"prev_revenue":2325,"qty":2,"prev_qty":2,"stock":38,"tier":"B"},{"name":"Ras Ghareb","revenue":1396,"prev_revenue":4424,"qty":1,"prev_qty":4,"stock":86,"tier":"B"},{"name":"V_Manial","revenue":1396,"prev_revenue":2674,"qty":2,"prev_qty":2,"stock":22,"tier":"B"},{"name":"V_Hegaz","revenue":1389,"prev_revenue":3555,"qty":3,"prev_qty":8,"stock":114,"tier":"B"},{"name":"Damanhur","revenue":1280,"prev_revenue":13034,"qty":2,"prev_qty":14,"stock":32,"tier":"B"},{"name":"BTECH mini Gzirt El Ward","revenue":1279,"prev_revenue":698,"qty":1,"prev_qty":1,"stock":26,"tier":"B"},{"name":"Marina_Kaian","revenue":1165,"prev_revenue":1744,"qty":1,"prev_qty":2,"stock":74,"tier":"B"},{"name":"BTECH mini Al Ittihad Club","revenue":1165,"prev_revenue":1686,"qty":1,"prev_qty":2,"stock":20,"tier":"B"},{"name":"BTECH mini Green Plaza Mall","revenue":1165,"prev_revenue":11975,"qty":1,"prev_qty":13,"stock":8,"tier":"B"},{"name":"BTECH mini Maadi Club","revenue":1165,"prev_revenue":3034,"qty":1,"prev_qty":2,"stock":2,"tier":"B"},{"name":"Desouk","revenue":1165,"prev_revenue":29656,"qty":1,"prev_qty":28,"stock":0,"tier":"B"},{"name":"P_Alex_Loran_Mega_Store","revenue":1165,"prev_revenue":3491,"qty":1,"prev_qty":2,"stock":20,"tier":"B"},{"name":"ElNozha","revenue":1078,"prev_revenue":17972,"qty":2,"prev_qty":12,"stock":62,"tier":"B"},{"name":"Aswan Mega store","revenue":1046,"prev_revenue":1455,"qty":1,"prev_qty":2,"stock":76,"tier":"B"},{"name":"BTECH mini Egyptian Shooting","revenue":1046,"prev_revenue":0,"qty":1,"prev_qty":0,"stock":4,"tier":"B"},{"name":"El Sadat","revenue":1046,"prev_revenue":5053,"qty":1,"prev_qty":7,"stock":4,"tier":"B"},{"name":"P_Flag MallPlus Flag Mall","revenue":1046,"prev_revenue":17804,"qty":1,"prev_qty":18,"stock":4,"tier":"B"},{"name":"P_Tanta","revenue":1046,"prev_revenue":13961,"qty":1,"prev_qty":9,"stock":4,"tier":"B"},{"name":"V_Fayoum","revenue":1046,"prev_revenue":4303,"qty":1,"prev_qty":4,"stock":20,"tier":"B"},{"name":"V_Gihan3 Abasia","revenue":1046,"prev_revenue":2092,"qty":1,"prev_qty":2,"stock":18,"tier":"B"},{"name":"V_Mansoura","revenue":1046,"prev_revenue":11163,"qty":1,"prev_qty":8,"stock":0,"tier":"B"},{"name":"V_Moharam Bek","revenue":1046,"prev_revenue":1863,"qty":1,"prev_qty":2,"stock":10,"tier":"B"},{"name":"V_Safwa Zaid","revenue":1046,"prev_revenue":698,"qty":1,"prev_qty":1,"stock":42,"tier":"B"},{"name":"MAX Arabia Mall","revenue":698,"prev_revenue":5590,"qty":1,"prev_qty":5,"stock":0,"tier":"B"},{"name":"BTECH MAX Taj City","revenue":698,"prev_revenue":0,"qty":1,"prev_qty":0,"stock":156,"tier":"B"},{"name":"El Mokattam","revenue":698,"prev_revenue":3372,"qty":1,"prev_qty":4,"stock":34,"tier":"B"},{"name":"BTECH mini Al Zohour Club","revenue":698,"prev_revenue":1046,"qty":1,"prev_qty":1,"stock":20,"tier":"B"},{"name":"V_Winget","revenue":698,"prev_revenue":13676,"qty":1,"prev_qty":13,"stock":0,"tier":"B"},{"name":"Mega Faisal","revenue":640,"prev_revenue":4882,"qty":1,"prev_qty":5,"stock":2,"tier":"B"},{"name":"P_Mega Alex Sidi Gaber","revenue":640,"prev_revenue":2561,"qty":1,"prev_qty":3,"stock":12,"tier":"B"},{"name":"V_Midor","revenue":640,"prev_revenue":10595,"qty":1,"prev_qty":10,"stock":22,"tier":"B"},{"name":"El Gouna Business Park","revenue":584,"prev_revenue":3257,"qty":1,"prev_qty":3,"stock":20,"tier":"B"},{"name":"V_Hadayek El Ahram","revenue":106,"prev_revenue":17786,"qty":1,"prev_qty":16,"stock":16,"tier":"B"},{"name":"El Betash","revenue":0,"prev_revenue":7440,"qty":0,"prev_qty":7,"stock":40,"tier":"NO_SALES"},{"name":"Shebin El Koum","revenue":0,"prev_revenue":12552,"qty":0,"prev_qty":12,"stock":4,"tier":"NO_SALES"},{"name":"Suez_Branch","revenue":0,"prev_revenue":5936,"qty":0,"prev_qty":7,"stock":138,"tier":"NO_SALES"},{"name":"Port Said","revenue":0,"prev_revenue":2674,"qty":0,"prev_qty":2,"stock":52,"tier":"NO_SALES"},{"name":"10th of Ramadan WHRe-9026","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":1232,"tier":"NO_SALES"},{"name":"10th Show Room WH","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":1674,"tier":"NO_SALES"},{"name":"Agami","revenue":0,"prev_revenue":1165,"qty":0,"prev_qty":1,"stock":50,"tier":"NO_SALES"},{"name":"AsafraAlex_2011","revenue":0,"prev_revenue":2966,"qty":0,"prev_qty":3,"stock":28,"tier":"NO_SALES"},{"name":"Assuit 2","revenue":0,"prev_revenue":13619,"qty":0,"prev_qty":11,"stock":2,"tier":"NO_SALES"},{"name":"Aswan Dark Store","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":4,"tier":"NO_SALES"},{"name":"Asyut WH","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":26,"tier":"NO_SALES"},{"name":"B.Mobile WH2_64","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":0,"tier":"NO_SALES"},{"name":"Beni Suef","revenue":0,"prev_revenue":12330,"qty":0,"prev_qty":14,"stock":36,"tier":"NO_SALES"},{"name":"BTECH mini Arab Contractors Club","revenue":0,"prev_revenue":6500,"qty":0,"prev_qty":5,"stock":36,"tier":"NO_SALES"},{"name":"BTECH mini CC Banha","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":20,"tier":"NO_SALES"},{"name":"BTECH mini CC Shebin Elkoum","revenue":0,"prev_revenue":127,"qty":0,"prev_qty":1,"stock":28,"tier":"NO_SALES"},{"name":"BTECH mini Dewaka","revenue":0,"prev_revenue":4184,"qty":0,"prev_qty":4,"stock":8,"tier":"NO_SALES"},{"name":"BTECH mini El Jazeera Youth Center","revenue":0,"prev_revenue":4189,"qty":0,"prev_qty":5,"stock":34,"tier":"NO_SALES"},{"name":"BTECH Mini MPC","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":0,"tier":"NO_SALES"},{"name":"BTECH mini Smouha Club","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":16,"tier":"NO_SALES"},{"name":"BTECH mini Sporting Club","revenue":0,"prev_revenue":4422,"qty":0,"prev_qty":4,"stock":20,"tier":"NO_SALES"},{"name":"BTECH mini Teachers Club","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":6,"tier":"NO_SALES"},{"name":"BTECH mini  Abu Al Matamir","revenue":0,"prev_revenue":3954,"qty":0,"prev_qty":4,"stock":16,"tier":"NO_SALES"},{"name":"BTECH mini  El Mandara","revenue":0,"prev_revenue":3607,"qty":0,"prev_qty":4,"stock":2,"tier":"NO_SALES"},{"name":"BTECH mini  Shinzo Abe","revenue":0,"prev_revenue":6051,"qty":0,"prev_qty":3,"stock":60,"tier":"NO_SALES"},{"name":"Cairo Retail Warehouses","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":988,"tier":"NO_SALES"},{"name":"Call center-WH-Tanash","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":32,"tier":"NO_SALES"},{"name":"Luxor_2","revenue":0,"prev_revenue":69701,"qty":0,"prev_qty":67,"stock":108,"tier":"NO_SALES"},{"name":"Mahalla","revenue":0,"prev_revenue":3374,"qty":0,"prev_qty":2,"stock":26,"tier":"NO_SALES"},{"name":"Maintenance BMobile","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":0,"tier":"NO_SALES"},{"name":"Makadi Bay","revenue":0,"prev_revenue":1046,"qty":0,"prev_qty":1,"stock":36,"tier":"NO_SALES"},{"name":"Malawi","revenue":0,"prev_revenue":24155,"qty":0,"prev_qty":24,"stock":14,"tier":"NO_SALES"},{"name":"Mansoura Outlet","revenue":0,"prev_revenue":2326,"qty":0,"prev_qty":1,"stock":0,"tier":"NO_SALES"},{"name":"Masara outlet","revenue":0,"prev_revenue":441,"qty":0,"prev_qty":2,"stock":0,"tier":"NO_SALES"},{"name":"Mohandesin Outlet","revenue":0,"prev_revenue":2917,"qty":0,"prev_qty":5,"stock":0,"tier":"NO_SALES"},{"name":"P_CFC Mall","revenue":0,"prev_revenue":6629,"qty":0,"prev_qty":5,"stock":2,"tier":"NO_SALES"},{"name":"P_El Souf","revenue":0,"prev_revenue":2092,"qty":0,"prev_qty":2,"stock":28,"tier":"NO_SALES"},{"name":"P_Salah_Salim_Mega_Store","revenue":0,"prev_revenue":15068,"qty":0,"prev_qty":14,"stock":32,"tier":"NO_SALES"},{"name":"Partner Truck 1","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":2,"tier":"NO_SALES"},{"name":"Partner Vodafone 2","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":0,"tier":"NO_SALES"},{"name":"Show Room - Corp. Sale-38","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":2674,"tier":"NO_SALES"},{"name":"Sohag","revenue":0,"prev_revenue":1863,"qty":0,"prev_qty":2,"stock":48,"tier":"NO_SALES"},{"name":"Tanash OUTLET Store","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":0,"tier":"NO_SALES"},{"name":"V_2Mansoura","revenue":0,"prev_revenue":12443,"qty":0,"prev_qty":9,"stock":24,"tier":"NO_SALES"},{"name":"V_City Center Alex","revenue":0,"prev_revenue":0,"qty":0,"prev_qty":0,"stock":24,"tier":"NO_SALES"},{"name":"V_El Mataria","revenue":0,"prev_revenue":8487,"qty":0,"prev_qty":8,"stock":12,"tier":"NO_SALES"},{"name":"V_Kafr ElSheikh","revenue":0,"prev_revenue":29081,"qty":0,"prev_qty":27,"stock":8,"tier":"NO_SALES"},{"name":"V_Kasr El Einy","revenue":0,"prev_revenue":4060,"qty":0,"prev_qty":2,"stock":10,"tier":"NO_SALES"},{"name":"V_San_Stefano Mall","revenue":0,"prev_revenue":4772,"qty":0,"prev_qty":5,"stock":22,"tier":"NO_SALES"}];

// ── PRODUCTS LIST (65 items) ──
const PRODUCTS=[
  {n:"Oraimo A to C Cable OCDC3200 3A 1M",p:85},{n:"Oraimo BT Headphone OHP-610S",p:1517},
  {n:"Oraimo C to C Cable OCD-154CC 3A 1.5M",p:105},{n:"Oraimo CH OCW5183E +L53 PD 18W with Cable",p:235},
  {n:"Oraimo Cable C to C 3M 100W OCD-173CC",p:366},{n:"Oraimo Cable C to Lightning OCD-CL54 2.4A 1M",p:142},
  {n:"Oraimo Cable C:C 60W OCD114CC",p:113},{n:"Oraimo Car Mount OCM-12",p:235},
  {n:"Oraimo Car Charger 48W OCC73D",p:466},{n:"Oraimo Charger 18W Gift",p:584},
  {n:"Oraimo Charger OCW7331E 33W GaN Fast Dual",p:466},{n:"Oraimo Charger QC3+PD3 20W OCW5203ECC",p:290},
  {n:"Oraimo Charger Kit OCW-E106S-CL55",p:290},{n:"Oraimo Data Cable Type-C OCD-C53 2A 1M",p:75},
  {n:"Oraimo Earphone Type-C OEP-650",p:185},{n:"Oraimo Neckband OEB611 ANC",p:1396},
  {n:"Oraimo OCD 152C USB A to C 1m Fast",p:85},{n:"Oraimo OCW-5451ECC 45W GaN Ultra PD",p:599},
  {n:"Oraimo P.Bank OPB-7103C 22.5W 10K",p:1279},{n:"Oraimo Portable Speaker OBS382",p:1165},
  {n:"Oraimo Power Bank 10K OPB-7100Q",p:698},{n:"Oraimo Power Bank 10K OPB-P5101",p:698},
  {n:"Oraimo Power Bank 10K OPB-P7101",p:930},{n:"Oraimo PowerHub OWSE3420 20W 6in1",p:837},
  {n:"Oraimo PowerJet 130 OPB-727SQ 27600mAh",p:3499},{n:"Oraimo PowerNova L21 OPB-7203C 30W 20K",p:1749},
  {n:"Oraimo Smart Watch 6N OSW-8000N",p:930},{n:"Oraimo Smart Watch Nova2 OSW814",p:2326},
  {n:"Oraimo Smart Watch OSW-20BK",p:1619},{n:"Oraimo Smart Watch OSW-30",p:1517},
  {n:"Oraimo Smart Watch OSW-42",p:1862},{n:"Oraimo Smart Watch OSW-801",p:1365},
  {n:"Oraimo Smart Watch OSW-802N",p:2443},{n:"Oraimo Smart Watch OSW-804",p:1165},
  {n:"Oraimo Smart Watch OSW-805",p:1046},{n:"Oraimo Smart Watch OSW-810",p:1988},
  {n:"Oraimo Smart Watch OSW-812",p:1628},{n:"Oraimo Smart Watch OSW-850H",p:6906},
  {n:"Oraimo TWS E02D",p:859},{n:"Oraimo TWS Earbuds Lite OTW-330",p:657},
  {n:"Oraimo TWS OEB-E104DC",p:1012},{n:"Oraimo TWS OEB-E108D",p:2095},
  {n:"Oraimo TWS OHP317",p:1222},{n:"Oraimo TWS OTW-323",p:698},
  {n:"Oraimo TWS OTW-330",p:607},{n:"Oraimo TWS OTW-330S Speed",p:640},
  {n:"Oraimo TWS OTW-625 SpaceBuds Z ANC",p:1165},{n:"Oraimo TWS OTW-630",p:2124},
  {n:"Oraimo TWS OTW-930",p:3954},{n:"Oraimo TWS OTW323",p:698},
  {n:"Oraimo TWS OTW323P Speed",p:1046},{n:"Oraimo TWS OTW323SP",p:1165},
  {n:"Oraimo TWS OTW324 SpaceBuds Lite",p:698},{n:"Oraimo TWS OpenArc OPN675",p:3024},
  {n:"Oraimo TWS Openpods OPN-50D",p:2209},{n:"Oraimo Type-C Cable OCD-C54",p:100},
  {n:"Oraimo USB A to Lightning OCD-L32",p:95},{n:"Oraimo Wall Charger 18W OCW-E97S",p:228},
  {n:"Oraimo Wall Charger 25W OCW-E100D",p:407},{n:"Oraimo Watch OSW-16",p:708},
  {n:"Oraimo Wired Earphone OEP320",p:95},{n:"Oraimo Wired Earphone OEP320S",p:118},
  {n:"Oraimo Wireless Charger 15W OWH-1151",p:576},{n:"Oraimo Wireless Headset OHP917",p:2198},
  {n:"Oraimo Wireless Speaker SpaceBox Pro 80W OBS682",p:4604},
  {n:"Oraimo Watch Strap WB03",p:101},{n:"Oraimo Wired Headphone OEP-E11",p:85},
  {n:"Oraimo Wired Headphone OEP-E21P",p:122}
].map(x=>({name:x.n,price:x.p}));


// ── MANAGERS (team leaders) ──
var MANAGERS = [
  {name: 'عبد الله فتحي'},
  {name: 'عبد الرحمن سامي'},
  {name: 'وليد رجب'}
];

// ── MARCH BASELINE (for projections) ──
var MARCH_DAYS_RECORDED = 11;
var MARCH_FULL_DAYS = 31;

// ── Q1 HISTORICAL DATA (Jan/Feb/Mar) ──
var Q1_STORES = [{"store": "B.ONLINE", "jan": 197623, "feb": 113359, "mar_actual": 227006, "mar_projected": 639745, "mar_daily": 20637, "qty_jan": 306, "qty_feb": 146, "qty_mar": 281}, {"store": "NEW IMBABA", "jan": 123144, "feb": 73558, "mar_actual": 112671, "mar_projected": 317528, "mar_daily": 10243, "qty_jan": 142, "qty_feb": 81, "qty_mar": 133}, {"store": "Banha_Mega_Store", "jan": 172436, "feb": 135398, "mar_actual": 109798, "mar_projected": 309432, "mar_daily": 9982, "qty_jan": 217, "qty_feb": 145, "qty_mar": 122}, {"store": "El kanater", "jan": 99488, "feb": 64523, "mar_actual": 109656, "mar_projected": 309031, "mar_daily": 9969, "qty_jan": 114, "qty_feb": 76, "qty_mar": 137}, {"store": "Qena", "jan": 75329, "feb": 51108, "mar_actual": 95089, "mar_projected": 267977, "mar_daily": 8644, "qty_jan": 102, "qty_feb": 69, "qty_mar": 104}, {"store": "Shobra", "jan": 115590, "feb": 95317, "mar_actual": 84942, "mar_projected": 239383, "mar_daily": 7722, "qty_jan": 135, "qty_feb": 102, "qty_mar": 102}, {"store": "26th July", "jan": 55830, "feb": 56664, "mar_actual": 83476, "mar_projected": 235249, "mar_daily": 7589, "qty_jan": 81, "qty_feb": 68, "qty_mar": 94}, {"store": "V_Badr", "jan": 87611, "feb": 63850, "mar_actual": 81337, "mar_projected": 229222, "mar_daily": 7394, "qty_jan": 120, "qty_feb": 87, "qty_mar": 91}, {"store": "Oraby", "jan": 91147, "feb": 80183, "mar_actual": 73120, "mar_projected": 206066, "mar_daily": 6647, "qty_jan": 120, "qty_feb": 100, "qty_mar": 89}, {"store": "El Zaher", "jan": 95449, "feb": 72912, "mar_actual": 67176, "mar_projected": 189315, "mar_daily": 6107, "qty_jan": 124, "qty_feb": 81, "qty_mar": 75}, {"store": "Dar El Salam", "jan": 75694, "feb": 49383, "mar_actual": 64733, "mar_projected": 182430, "mar_daily": 5885, "qty_jan": 106, "qty_feb": 63, "qty_mar": 73}, {"store": "ElSoudan Street", "jan": 98822, "feb": 73439, "mar_actual": 64544, "mar_projected": 181897, "mar_daily": 5868, "qty_jan": 147, "qty_feb": 90, "qty_mar": 80}, {"store": "El Helmya", "jan": 32687, "feb": 37590, "mar_actual": 59983, "mar_projected": 169044, "mar_daily": 5453, "qty_jan": 39, "qty_feb": 48, "qty_mar": 72}, {"store": "HQ Call Center stop", "jan": 47274, "feb": 32927, "mar_actual": 55998, "mar_projected": 157813, "mar_daily": 5091, "qty_jan": 59, "qty_feb": 41, "qty_mar": 55}, {"store": "Luxor_2", "jan": 7053, "feb": 13930, "mar_actual": 53610, "mar_projected": 151082, "mar_daily": 4874, "qty_jan": 10, "qty_feb": 20, "qty_mar": 67}, {"store": "Qalyub", "jan": 125660, "feb": 67384, "mar_actual": 50588, "mar_projected": 142565, "mar_daily": 4599, "qty_jan": 155, "qty_feb": 83, "qty_mar": 59}, {"store": "Maadi2", "jan": 87757, "feb": 69490, "mar_actual": 48514, "mar_projected": 136721, "mar_daily": 4410, "qty_jan": 100, "qty_feb": 83, "qty_mar": 58}, {"store": "V_Hassan El Maamon", "jan": 46472, "feb": 41026, "mar_actual": 45658, "mar_projected": 128672, "mar_daily": 4151, "qty_jan": 76, "qty_feb": 52, "qty_mar": 77}, {"store": "V_El Tahrir", "jan": 71262, "feb": 83263, "mar_actual": 45196, "mar_projected": 127370, "mar_daily": 4109, "qty_jan": 94, "qty_feb": 111, "qty_mar": 47}, {"store": "P_Mall Of October", "jan": 53983, "feb": 24440, "mar_actual": 43342, "mar_projected": 122146, "mar_daily": 3940, "qty_jan": 78, "qty_feb": 30, "qty_mar": 61}, {"store": "P_Mega Helwan", "jan": 94528, "feb": 43062, "mar_actual": 40965, "mar_projected": 115447, "mar_daily": 3724, "qty_jan": 120, "qty_feb": 59, "qty_mar": 55}, {"store": "Faisal", "jan": 84038, "feb": 38814, "mar_actual": 40944, "mar_projected": 115387, "mar_daily": 3722, "qty_jan": 125, "qty_feb": 58, "qty_mar": 59}, {"store": "P_Town Center El Salam", "jan": 17490, "feb": 51290, "mar_actual": 34126, "mar_projected": 96174, "mar_daily": 3102, "qty_jan": 38, "qty_feb": 77, "qty_mar": 66}, {"store": "P_Sky Mall El Sherouk", "jan": 51303, "feb": 30981, "mar_actual": 32255, "mar_projected": 90901, "mar_daily": 2932, "qty_jan": 65, "qty_feb": 44, "qty_mar": 40}, {"store": "V_Bani Suef", "jan": 59487, "feb": 27117, "mar_actual": 31795, "mar_projected": 89604, "mar_daily": 2890, "qty_jan": 85, "qty_feb": 37, "qty_mar": 41}, {"store": "Fakous", "jan": 44796, "feb": 34594, "mar_actual": 30950, "mar_projected": 87223, "mar_daily": 2814, "qty_jan": 65, "qty_feb": 54, "qty_mar": 40}, {"store": "2Ain Shams", "jan": 18575, "feb": 39369, "mar_actual": 30815, "mar_projected": 86842, "mar_daily": 2801, "qty_jan": 25, "qty_feb": 50, "qty_mar": 44}, {"store": "V_Gesr El Suez", "jan": 21504, "feb": 42762, "mar_actual": 29146, "mar_projected": 82138, "mar_daily": 2650, "qty_jan": 28, "qty_feb": 56, "qty_mar": 37}, {"store": "P_Mall OF Egypt", "jan": 10406, "feb": 13641, "mar_actual": 27785, "mar_projected": 78304, "mar_daily": 2526, "qty_jan": 22, "qty_feb": 27, "qty_mar": 43}, {"store": "AKKAD", "jan": 46026, "feb": 39628, "mar_actual": 27187, "mar_projected": 76618, "mar_daily": 2472, "qty_jan": 67, "qty_feb": 41, "qty_mar": 38}, {"store": "Domyat", "jan": 34611, "feb": 30361, "mar_actual": 26771, "mar_projected": 75446, "mar_daily": 2434, "qty_jan": 47, "qty_feb": 39, "qty_mar": 31}, {"store": "Delta_Berket_ElSabaa", "jan": 15154, "feb": 29662, "mar_actual": 25560, "mar_projected": 72032, "mar_daily": 2324, "qty_jan": 24, "qty_feb": 35, "qty_mar": 25}, {"store": "V_Dokki", "jan": 21334, "feb": 12485, "mar_actual": 25069, "mar_projected": 70650, "mar_daily": 2279, "qty_jan": 29, "qty_feb": 17, "qty_mar": 31}, {"store": "El Menia Mega Store", "jan": 43286, "feb": 29044, "mar_actual": 24868, "mar_projected": 70081, "mar_daily": 2261, "qty_jan": 56, "qty_feb": 40, "qty_mar": 30}, {"store": "P_Mega Shubra El Kheima", "jan": 105198, "feb": 49710, "mar_actual": 23921, "mar_projected": 67414, "mar_daily": 2175, "qty_jan": 154, "qty_feb": 61, "qty_mar": 34}, {"store": "V_Obour2", "jan": 32595, "feb": 30368, "mar_actual": 23904, "mar_projected": 67367, "mar_daily": 2173, "qty_jan": 42, "qty_feb": 31, "qty_mar": 24}, {"store": "V_City Center Maadi", "jan": 45347, "feb": 28878, "mar_actual": 23211, "mar_projected": 65412, "mar_daily": 2110, "qty_jan": 58, "qty_feb": 31, "qty_mar": 27}, {"store": "V_Maadi Grand Mall", "jan": 21932, "feb": 19924, "mar_actual": 22928, "mar_projected": 64616, "mar_daily": 2084, "qty_jan": 30, "qty_feb": 29, "qty_mar": 39}, {"store": "New Domyat", "jan": 18703, "feb": 10689, "mar_actual": 22824, "mar_projected": 64322, "mar_daily": 2075, "qty_jan": 29, "qty_feb": 15, "qty_mar": 32}, {"store": "Desouk", "jan": 29519, "feb": 16253, "mar_actual": 22574, "mar_projected": 63617, "mar_daily": 2052, "qty_jan": 40, "qty_feb": 22, "qty_mar": 28}, {"store": "V_Kafr ElSheikh", "jan": 32283, "feb": 21247, "mar_actual": 22273, "mar_projected": 62769, "mar_daily": 2025, "qty_jan": 47, "qty_feb": 29, "qty_mar": 27}, {"store": "Mall Of Arabia", "jan": 7229, "feb": 789, "mar_actual": 22077, "mar_projected": 62218, "mar_daily": 2007, "qty_jan": 10, "qty_feb": 2, "qty_mar": 27}, {"store": "New Sohag", "jan": 24387, "feb": 31973, "mar_actual": 21957, "mar_projected": 61879, "mar_daily": 1996, "qty_jan": 41, "qty_feb": 47, "qty_mar": 28}, {"store": "V_Ismailia Square", "jan": 2668, "feb": 1095, "mar_actual": 20724, "mar_projected": 58403, "mar_daily": 1884, "qty_jan": 5, "qty_feb": 2, "qty_mar": 23}, {"store": "V_El Sherouk", "jan": 20501, "feb": 17436, "mar_actual": 20421, "mar_projected": 57550, "mar_daily": 1856, "qty_jan": 29, "qty_feb": 23, "qty_mar": 22}, {"store": "V_Elmenia", "jan": 20281, "feb": 5386, "mar_actual": 19571, "mar_projected": 55155, "mar_daily": 1779, "qty_jan": 30, "qty_feb": 10, "qty_mar": 24}, {"store": "Malawi", "jan": 21904, "feb": 31543, "mar_actual": 18488, "mar_projected": 52102, "mar_daily": 1681, "qty_jan": 30, "qty_feb": 41, "qty_mar": 24}, {"store": "Ain Shams", "jan": 12988, "feb": 47120, "mar_actual": 18227, "mar_projected": 51368, "mar_daily": 1657, "qty_jan": 20, "qty_feb": 55, "qty_mar": 20}, {"store": "Misr Al Gadida", "jan": 24931, "feb": 20727, "mar_actual": 18175, "mar_projected": 51222, "mar_daily": 1652, "qty_jan": 29, "qty_feb": 21, "qty_mar": 27}, {"store": "New Roxy", "jan": 4819, "feb": 5388, "mar_actual": 14664, "mar_projected": 41326, "mar_daily": 1333, "qty_jan": 6, "qty_feb": 8, "qty_mar": 24}]

// ── ORAIMO SPECS DATABASE ──
const ORAIMO_SPECS = [

  /* ========================= 🎧 EARBUDS ========================= */
  {
    name:"Oraimo FreePods 3C", code:"OEB-E104DC",
    cat:"🎧 Earbuds", img:"🎧", color:"#FF4081", price:1012,
    specs:{
      bluetooth:{ar:"بلوتوث 5.3",en:"Bluetooth 5.3"},
      battery:{ar:"36 ساعة تشغيل",en:"36 Hours Playtime"},
      mic:{ar:"4 مايك ENC",en:"4-Mic ENC"},
      driver:{ar:"13 مم",en:"13mm Driver"},
      waterproof:{ar:"IPX5",en:"IPX5 Water Resistant"},
      fast_charge:{ar:"10 دقائق = 140 دقيقة",en:"10min = 140min play"}
    },
    sell:[
      {ar:"أفضل مكالمات في الفئة",en:"Best call quality in class"},
      {ar:"بطارية أقوى من المنافسين",en:"Stronger battery than competitors"},
      {ar:"Bass قوي جدًا",en:"Powerful bass"},
      {ar:"Gaming mode بدون تأخير",en:"Low latency gaming mode"}
    ],
    compare:{
      model:"Anker R50i",
      price:{ar:"حوالي 1100 جنيه (بي تك)",en:"≈1100 EGP (B.TECH)"},
      points:[
        {ar:"36 ساعة مقابل 30",en:"36h vs 30h"},
        {ar:"4 مايك vs 2",en:"4 mics vs 2"},
        {ar:"شحن أسرع",en:"Faster charging"}
      ]
    }
  },
  {
    name:"Oraimo FreePods Neo", code:"OEB-E105D",
    cat:"🎧 Earbuds", img:"🎧", color:"#FF3B3B", price:1165,
    specs:{
      bluetooth:{ar:"بلوتوث 5.3",en:"Bluetooth 5.3"},
      battery:{ar:"50 ساعة",en:"50 Hours Playtime"},
      mic:{ar:"ENC",en:"ENC Mic"},
      sound:{ar:"360° صوت محيطي",en:"360 Spatial Sound"}
    },
    sell:[
      {ar:"أقوى بطارية في الفئة",en:"Best battery in class"},
      {ar:"صوت محيطي",en:"Immersive sound"},
      {ar:"مناسب للجيمينج",en:"Great for gaming"}
    ],
    compare:{
      model:"Joyroom JR-T03",
      price:{ar:"حوالي 900 جنيه",en:"≈900 EGP"},
      points:[
        {ar:"بطارية أعلى بفرق كبير",en:"Much longer battery"},
        {ar:"ثبات اتصال أفضل",en:"Better connection stability"}
      ]
    }
  },
  {
    name:"Oraimo TWS OTW-930", code:"OTW-930",
    cat:"🎧 Earbuds", img:"🎧", color:"#AA00FF", price:3954,
    specs:{
      anc:{ar:"ANC إلغاء ضوضاء نشط",en:"Active Noise Cancelling"},
      battery:{ar:"40 ساعة مع الكيس",en:"40 Hours with case"},
      waterproof:{ar:"IPX5",en:"IPX5"},
      gaming:{ar:"لاتنس منخفض للألعاب",en:"Low latency gaming"},
      mic:{ar:"ENC للمكالمات",en:"ENC call technology"}
    },
    sell:[
      {ar:"ANC ينافس AirPods Pro بسعر أقل بكثير",en:"ANC rivals AirPods Pro at fraction of price"},
      {ar:"40 ساعة — أطول بطارية في الفئة",en:"40h — longest battery in class"},
      {ar:"صوت ممتاز للمحتوى والمكالمات",en:"Excellent audio & call quality"},
      {ar:"مثالية للطلاب والموظفين",en:"Perfect for students & professionals"}
    ],
    compare:{
      model:"Samsung Galaxy Buds2",
      price:{ar:"حوالي 3500 جنيه",en:"≈3500 EGP"},
      points:[
        {ar:"نفس ANC بسعر أقل",en:"Same ANC at lower price"},
        {ar:"بطارية أطول",en:"Longer battery life"},
        {ar:"gaming mode إضافية",en:"Extra gaming mode"}
      ]
    }
  },
  {
    name:"Oraimo TWS OpenArc OPN675", code:"OPN675",
    cat:"🎧 Earbuds", img:"🎧", color:"#00BCD4", price:3024,
    specs:{
      type:{ar:"Open-ear بدون سد الأذن",en:"Open-ear design"},
      battery:{ar:"60 ساعة مع الكيس",en:"60 Hours with case"},
      sound:{ar:"صوت ستيريو واسع",en:"Wide stereo sound"},
      design:{ar:"تصميم hook مريح",en:"Comfortable hook design"},
      use:{ar:"للرياضة والاستخدام اليومي",en:"Sports & daily use"}
    },
    sell:[
      {ar:"60 ساعة — الأطول في السوق",en:"60h — longest in market"},
      {ar:"Open-ear صحي للأذن",en:"Ear-healthy open design"},
      {ar:"مثالية للرياضيين وقيادة السيارة",en:"Perfect for sports & driving"},
      {ar:"صوت طبيعي وواضح",en:"Natural clear sound"}
    ],
    compare:{
      model:"Shokz OpenRun",
      price:{ar:"حوالي 5000 جنيه",en:"≈5000 EGP"},
      points:[
        {ar:"سعر أقل بفرق كبير",en:"Much lower price"},
        {ar:"بطارية أطول",en:"Longer battery"},
        {ar:"تصميم أنيق أكثر",en:"Sleeker design"}
      ]
    }
  },
  {
    name:"Oraimo TWS Openpods OPN-50D", code:"OPN-50D",
    cat:"🎧 Earbuds", img:"🎧", color:"#8BC34A", price:2209,
    specs:{
      type:{ar:"Open-ear تصميم عصري",en:"Modern open-ear"},
      battery:{ar:"30 ساعة",en:"30 Hours"},
      connect:{ar:"اتصال فوري",en:"Instant connection"},
      mic:{ar:"ميكروفون واضح",en:"Clear microphone"},
      comfort:{ar:"مريح للاستخدام الطويل",en:"Comfortable for long use"}
    },
    sell:[
      {ar:"تصميم Open-ear الأكثر أماناً",en:"Safest open-ear design"},
      {ar:"لا تسقط أثناء الرياضة",en:"Won't fall during exercise"},
      {ar:"مناسبة لكل أحجام الأذن",en:"Fits all ear sizes"},
      {ar:"الأفضل مع Oraimo Watch كبرومو",en:"Best bundled with Oraimo Watch"}
    ],
    compare:{
      model:"Huawei FreeClip",
      price:{ar:"حوالي 4000 جنيه",en:"≈4000 EGP"},
      points:[
        {ar:"سعر أقل بكثير",en:"Much cheaper"},
        {ar:"نفس مفهوم Open-ear",en:"Same open-ear concept"},
        {ar:"بطارية كافية للاستخدام اليومي",en:"Sufficient daily battery"}
      ]
    }
  },
  {
    name:"Oraimo TWS OEB-E108D", code:"OEB-E108D",
    cat:"🎧 Earbuds", img:"🎧", color:"#FF6D00", price:2095,
    specs:{
      anc:{ar:"ANC إلغاء ضوضاء",en:"Active Noise Cancelling"},
      battery:{ar:"35 ساعة",en:"35 Hours"},
      display:{ar:"شاشة LED بالكيس",en:"LED display on case"},
      mic:{ar:"ENC للمكالمات",en:"ENC call tech"},
      waterproof:{ar:"IPX5",en:"IPX5"}
    },
    sell:[
      {ar:"ANC بسعر اقتصادي جداً",en:"ANC at budget price"},
      {ar:"شاشة الكيس تُظهر نسبة البطارية",en:"Case shows battery percentage"},
      {ar:"35 ساعة كافية لرحلات طويلة",en:"35h great for long trips"},
      {ar:"أفضل من سامسونج Buds2 بنفس السعر",en:"Better than Samsung Buds2 at same price"}
    ],
    compare:{
      model:"Samsung Galaxy Buds FE",
      price:{ar:"حوالي 2000 جنيه",en:"≈2000 EGP"},
      points:[
        {ar:"شاشة على الكيس (ميزة فريدة)",en:"Case display (unique feature)"},
        {ar:"بطارية أطول",en:"Longer battery"},
        {ar:"ANC بنفس المستوى",en:"Same ANC level"}
      ]
    }
  },
  {
    name:"Oraimo Neckband OEB611 ANC", code:"OEB611",
    cat:"🎧 Earbuds", img:"🎧", color:"#795548", price:1396,
    specs:{
      anc:{ar:"ANC إلغاء ضوضاء",en:"Active Noise Cancelling"},
      battery:{ar:"30 ساعة",en:"30 Hours"},
      waterproof:{ar:"مقاومة للماء",en:"Water resistant"},
      design:{ar:"تصميم neckband مريح",en:"Comfortable neckband"},
      mic:{ar:"ENC للمكالمات",en:"ENC call quality"}
    },
    sell:[
      {ar:"ANC في neckband — نادر جداً",en:"ANC in neckband — very rare"},
      {ar:"30 ساعة لا تنتهي",en:"30h endless playtime"},
      {ar:"لا تقع من الأذن أبداً",en:"Never falls from ears"},
      {ar:"مثالية للموصلات والعمل الطويل",en:"Perfect for commutes & long work"}
    ],
    compare:{
      model:"Jabra Evolve 65e",
      price:{ar:"حوالي 4000 جنيه",en:"≈4000 EGP"},
      points:[
        {ar:"سعر أقل بكثير",en:"Much cheaper"},
        {ar:"ANC بنفس الجودة",en:"Same ANC quality"},
        {ar:"بطارية أطول",en:"Longer battery"}
      ]
    }
  },
  {
    name:"Oraimo BT Headphone OHP-610S", code:"OHP-610S",
    cat:"🎧 Headphone", img:"🎧", color:"#607D8B", price:1517,
    specs:{
      type:{ar:"Over-ear مريح",en:"Comfortable over-ear"},
      battery:{ar:"40 ساعة",en:"40 Hours"},
      bluetooth:{ar:"بلوتوث 5.3",en:"Bluetooth 5.3"},
      mic:{ar:"ميكروفون مدمج",en:"Built-in mic"},
      foldable:{ar:"قابل للطي",en:"Foldable design"}
    },
    sell:[
      {ar:"40 ساعة للطلاب والمذاكرة",en:"40h perfect for studying"},
      {ar:"صوت محيطي ممتاز",en:"Excellent surround sound"},
      {ar:"قابل للطي ومناسب للسفر",en:"Foldable & travel-ready"},
      {ar:"أرخص من Sony & JBL بمواصفات مقاربة",en:"Cheaper than Sony & JBL with similar specs"}
    ],
    compare:{
      model:"JBL Tune 510BT",
      price:{ar:"حوالي 2000 جنيه",en:"≈2000 EGP"},
      points:[
        {ar:"سعر أقل",en:"Lower price"},
        {ar:"بطارية أطول (40h vs 40h)",en:"Same battery life"},
        {ar:"تصميم مريح للاستخدام الطويل",en:"Comfortable for long sessions"}
      ]
    }
  },

  /* ========================= 🔋 POWER BANK ========================= */
  {
    name:"Oraimo Slice Link Pro", code:"OPB-P118D",
    cat:"🔋 Power Bank", img:"🔋", color:"#00C853", price:1279,
    specs:{
      capacity:{ar:"10000mAh",en:"10000mAh"},
      power:{ar:"22.5 وات",en:"22.5W Fast Charge"},
      cables:{ar:"كابلات مدمجة",en:"Built-in cables"},
      ports:{ar:"USB + Type-C",en:"USB + Type-C"}
    },
    sell:[
      {ar:"مش محتاج كابل",en:"No need for cables"},
      {ar:"خفيف وسهل الحمل",en:"Lightweight & portable"},
      {ar:"شحن سريع 22.5W",en:"22.5W fast charging"}
    ],
    compare:{
      model:"Anker PowerCore 10000",
      price:{ar:"حوالي 1200 جنيه",en:"≈1200 EGP"},
      points:[
        {ar:"كابلات مدمجة (ميزة قوية)",en:"Built-in cables (key advantage)"},
        {ar:"سعر أقل أو متساوي",en:"Lower or equal price"}
      ]
    }
  },
  {
    name:"Oraimo PowerBox 200", code:"OPB-P204D",
    cat:"🔋 Power Bank", img:"🔋", color:"#2979FF", price:1749,
    specs:{
      capacity:{ar:"20000mAh",en:"20000mAh"},
      power:{ar:"22.5W",en:"22.5W Fast Charge"},
      ports:{ar:"3 مخارج",en:"3 Outputs"}
    },
    sell:[
      {ar:"يشحن أكتر من جهاز في نفس الوقت",en:"Charge multiple devices simultaneously"},
      {ar:"سعة كبيرة تكفي أسبوع",en:"High capacity lasts a week"}
    ],
    compare:{
      model:"Xiaomi Mi Power Bank 3",
      price:{ar:"حوالي 1300 جنيه",en:"≈1300 EGP"},
      points:[
        {ar:"سرعة شحن أعلى",en:"Faster charging speed"},
        {ar:"عدد مخارج أكثر",en:"More output ports"}
      ]
    }
  },
  {
    name:"Oraimo PowerJet 130 OPB-727SQ 27600mAh", code:"OPB-727SQ",
    cat:"🔋 Power Bank", img:"🔋", color:"#FFD700", price:3499,
    specs:{
      capacity:{ar:"27600 mAh",en:"27600mAh"},
      power:{ar:"65W شحن سريع",en:"65W Fast Charge"},
      ports:{ar:"3 منافذ USB",en:"3 USB Ports"},
      display:{ar:"شاشة رقمية",en:"Digital display"},
      laptop:{ar:"يشحن لاب توب",en:"Charges laptops"}
    },
    sell:[
      {ar:"يشحن لاب توب + موبايل معاً",en:"Charges laptop + phone simultaneously"},
      {ar:"65W — أسرع شحن في الفئة",en:"65W — fastest in class"},
      {ar:"يكفي لرحلات أسبوع كامل",en:"Lasts a full week of travel"},
      {ar:"أقوى من Anker بنفس السعر",en:"More powerful than Anker at same price"}
    ],
    compare:{
      model:"Anker PowerCore III 26K",
      price:{ar:"حوالي 4000 جنيه",en:"≈4000 EGP"},
      points:[
        {ar:"سعر أقل",en:"Lower price"},
        {ar:"65W vs 60W",en:"65W vs 60W charging"},
        {ar:"سعة أعلى",en:"Higher capacity"}
      ]
    }
  },
  {
    name:"Oraimo PowerNova L21 OPB-7203C 30W 20K", code:"OPB-7203C",
    cat:"🔋 Power Bank", img:"🔋", color:"#00C853", price:1749,
    specs:{
      capacity:{ar:"20000 mAh",en:"20000mAh"},
      power:{ar:"30W PD",en:"30W PD Fast Charge"},
      ports:{ar:"Type-C + USB-A",en:"Type-C + USB-A"},
      charges:{ar:"يشحن الموبايل 4 مرات",en:"Charges phone 4x"},
      slim:{ar:"رفيع وخفيف الوزن",en:"Slim & lightweight"}
    },
    sell:[
      {ar:"30W PD — يشحن iPhone في ساعة",en:"30W PD — charges iPhone in 1hr"},
      {ar:"رفيع وخفيف للحمل اليومي",en:"Slim & light for daily carry"},
      {ar:"يشحن الموبايل 4-5 مرات",en:"Charges phone 4-5 times"},
      {ar:"أفضل قيمة في السوق المصري",en:"Best value in Egyptian market"}
    ],
    compare:{
      model:"Baseus Adaman 20000",
      price:{ar:"حوالي 2000 جنيه",en:"≈2000 EGP"},
      points:[
        {ar:"سعر أقل",en:"Lower price"},
        {ar:"نفس سرعة الشحن",en:"Same charging speed"},
        {ar:"تصميم أرق",en:"Slimmer design"}
      ]
    }
  },
  {
    name:"Oraimo P.Bank OPB-7103C 22.5W 10K", code:"OPB-7103C",
    cat:"🔋 Power Bank", img:"🔋", color:"#2979FF", price:1279,
    specs:{
      capacity:{ar:"10000 mAh",en:"10000mAh"},
      power:{ar:"22.5W",en:"22.5W Fast Charge"},
      ports:{ar:"USB-C + USB-A",en:"USB-C + USB-A"},
      display:{ar:"شاشة رقمية",en:"Digital display"},
      size:{ar:"حجم صغير جداً",en:"Ultra compact size"}
    },
    sell:[
      {ar:"الأصغر حجماً في فئة 10000",en:"Smallest in 10000mAh class"},
      {ar:"22.5W يشحن أسرع من معظم المنافسين",en:"22.5W faster than most competitors"},
      {ar:"شاشة رقمية تُظهر نسبة الشحن الدقيقة",en:"Digital display shows exact battery %"},
      {ar:"مثالية للفتيات والطلاب",en:"Perfect for girls & students"}
    ],
    compare:{
      model:"Anker PowerCore 10000",
      price:{ar:"حوالي 1200 جنيه",en:"≈1200 EGP"},
      points:[
        {ar:"شاشة رقمية (ميزة إضافية)",en:"Digital display (extra feature)"},
        {ar:"شحن أسرع",en:"Faster charging"},
        {ar:"سعر متقارب",en:"Similar price"}
      ]
    }
  },

  /* ========================= ⚡ CHARGERS ========================= */
  {
    name:"Oraimo PowerCube 20", code:"OCW-U66S",
    cat:"⚡ Charger", img:"⚡", color:"#FF3B3B", price:290,
    specs:{
      power:{ar:"20W PD",en:"20W PD"},
      type:{ar:"Type-C",en:"USB-C"},
      tech:{ar:"GaN",en:"GaN Technology"}
    },
    sell:[
      {ar:"صغير جداً — حجم كبريتة",en:"Ultra compact — matchbox size"},
      {ar:"شحن سريع 20W",en:"20W fast charging"},
      {ar:"GaN — حرارة أقل وكفاءة أعلى",en:"GaN — less heat, more efficient"}
    ],
    compare:{
      model:"Anker Nano 20W",
      price:{ar:"حوالي 700 جنيه",en:"≈700 EGP"},
      points:[
        {ar:"نفس الأداء بسعر أقل بكثير",en:"Same performance at much lower price"}
      ]
    }
  },
  {
    name:"Oraimo PowerGaN 33", code:"OCW-U112D",
    cat:"⚡ Charger", img:"⚡", color:"#9c27b0", price:466,
    specs:{
      power:{ar:"33W",en:"33W Fast Charge"},
      ports:{ar:"USB + Type-C",en:"Dual Port USB + Type-C"}
    },
    sell:[
      {ar:"يشحن جهازين في نفس الوقت",en:"Charges 2 devices simultaneously"},
      {ar:"33W سرعة عالية",en:"33W high speed"},
      {ar:"GaN — أصغر وأبرد من الشواحن العادية",en:"GaN — smaller & cooler than regular chargers"}
    ],
    compare:{
      model:"Joyroom 30W Charger",
      price:{ar:"حوالي 500 جنيه",en:"≈500 EGP"},
      points:[
        {ar:"منفذين بدلاً من واحد",en:"Dual port vs single"},
        {ar:"ثبات أعلى في الأداء",en:"More stable performance"}
      ]
    }
  },
  {
    name:"Oraimo OCW-5451ECC 45W GaN Ultra PD", code:"OCW-5451ECC",
    cat:"⚡ Charger", img:"⚡", color:"#FF9800", price:599,
    specs:{
      power:{ar:"45W PD",en:"45W PD Fast Charge"},
      tech:{ar:"GaN تقنية متقدمة",en:"Advanced GaN Technology"},
      ports:{ar:"USB-C + USB-A",en:"USB-C + USB-A"},
      laptop:{ar:"يشحن MacBook",en:"Charges MacBook"}
    },
    sell:[
      {ar:"GaN — أصغر بـ60% من الشواحن العادية",en:"GaN — 60% smaller than regular chargers"},
      {ar:"45W يشحن iPhone من 0-80% في 35 دقيقة",en:"45W charges iPhone 0-80% in 35min"},
      {ar:"يشحن MacBook Air بكفاءة",en:"Efficiently charges MacBook Air"},
      {ar:"مثالي للمسافرين",en:"Perfect for travelers"}
    ],
    compare:{
      model:"Apple 45W USB-C",
      price:{ar:"حوالي 1500 جنيه",en:"≈1500 EGP"},
      points:[
        {ar:"نفس الأداء بسعر أقل بكثير",en:"Same performance at much lower price"},
        {ar:"منفذ إضافي USB-A",en:"Extra USB-A port"},
        {ar:"متوافق مع كل الأجهزة",en:"Compatible with all devices"}
      ]
    }
  },
  {
    name:"Oraimo Charger OCW7331E 33W GaN Fast Dual", code:"OCW7331E",
    cat:"⚡ Charger", img:"⚡", color:"#E91E63", price:466,
    specs:{
      power:{ar:"33W GaN",en:"33W GaN"},
      ports:{ar:"USB-C + USB-A",en:"USB-C + USB-A Dual Port"},
      size:{ar:"حجم صغير جداً",en:"Ultra compact"}
    },
    sell:[
      {ar:"شاحن + كابل = حزمة مثالية",en:"Charger + cable = perfect bundle"},
      {ar:"GaN يوفر الكهرباء ويقلل السخونة",en:"GaN saves power & reduces heat"},
      {ar:"منفذان لشحن جهازين معاً",en:"Dual port for 2 devices"},
      {ar:"أصغر شاحن 33W في السوق",en:"Smallest 33W charger in market"}
    ],
    compare:{
      model:"Baseus 33W",
      price:{ar:"حوالي 500 جنيه",en:"≈500 EGP"},
      points:[
        {ar:"GaN (ميزة تقنية أعلى)",en:"GaN (higher tech advantage)"},
        {ar:"سعر أقل أو متقارب",en:"Same or lower price"}
      ]
    }
  },
  {
    name:"Oraimo Car Charger 48W OCC73D", code:"OCC73D",
    cat:"⚡ Car Charger", img:"⚡", color:"#FF9800", price:466,
    specs:{
      power:{ar:"48W",en:"48W"},
      ports:{ar:"USB-C PD + USB-A",en:"USB-C PD + USB-A"},
      indicator:{ar:"مؤشر LED",en:"LED indicator"},
      design:{ar:"تصميم أنيق",en:"Sleek design"}
    },
    sell:[
      {ar:"48W — أسرع شاحن سيارة Oraimo",en:"48W — fastest Oraimo car charger"},
      {ar:"يشحن iPhone من 0-50% في 30 دقيقة",en:"Charges iPhone 0-50% in 30min"},
      {ar:"يناسب كل السيارات",en:"Fits all cars"},
      {ar:"هدية مثالية لأصحاب السيارات",en:"Perfect gift for car owners"}
    ],
    compare:{
      model:"Baseus 45W Car Charger",
      price:{ar:"حوالي 600 جنيه",en:"≈600 EGP"},
      points:[
        {ar:"48W vs 45W (أسرع)",en:"48W vs 45W (faster)"},
        {ar:"سعر أقل",en:"Lower price"}
      ]
    }
  },
  {
    name:"Oraimo Wireless Charger 15W OWH-1151", code:"OWH-1151",
    cat:"⚡ Wireless Charger", img:"⚡", color:"#00BCD4", price:576,
    specs:{
      power:{ar:"15W شحن لاسلكي",en:"15W Wireless Charging"},
      compat:{ar:"متوافق Qi مع iPhone وSamsung",en:"Qi compatible iPhone & Samsung"},
      indicator:{ar:"LED مؤشر",en:"LED indicator"},
      slim:{ar:"حجم رفيع",en:"Slim profile"},
      heat:{ar:"لا يسخن",en:"Low heat generation"}
    },
    sell:[
      {ar:"15W — أسرع من Apple MagSafe الأصلي",en:"15W — faster than Apple MagSafe"},
      {ar:"يشحن عبر الجراب حتى 5mm",en:"Charges through case up to 5mm"},
      {ar:"لا حاجة لفك الجراب",en:"No need to remove case"},
      {ar:"سعر أقل من Apple و Samsung",en:"Cheaper than Apple & Samsung"}
    ],
    compare:{
      model:"Apple MagSafe",
      price:{ar:"حوالي 2000 جنيه",en:"≈2000 EGP"},
      points:[
        {ar:"نفس السرعة بسعر أقل بكثير",en:"Same speed at much lower price"},
        {ar:"متوافق مع Samsung أيضاً",en:"Compatible with Samsung too"}
      ]
    }
  },

  /* ========================= ⌚ SMART WATCH ========================= */
  {
    name:"Oraimo Watch 5R", code:"OSW-18",
    cat:"⌚ Smart Watch", img:"⌚", color:"#00C853", price:930,
    specs:{
      battery:{ar:"7 أيام",en:"7 Days Battery"},
      health:{ar:"نبض + نوم",en:"Heart Rate + Sleep Tracking"},
      waterproof:{ar:"IP68",en:"IP68 Water Resistant"}
    },
    sell:[
      {ar:"بطارية 7 أيام — لا تحتاج شحن يومي",en:"7-day battery — no daily charging"},
      {ar:"تصميم شيك وخفيف",en:"Sleek & lightweight design"},
      {ar:"تتبع صحي شامل",en:"Comprehensive health tracking"}
    ],
    compare:{
      model:"Huawei Band 8",
      price:{ar:"حوالي 1800 جنيه",en:"≈1800 EGP"},
      points:[
        {ar:"سعر أقل بفرق واضح",en:"Significantly cheaper"},
        {ar:"بطارية متساوية أو أطول",en:"Equal or longer battery"}
      ]
    }
  },
  {
    name:"Oraimo Smart Watch OSW-850H", code:"OSW-850H",
    cat:"⌚ Smart Watch", img:"⌚", color:"#FFD700", price:6906,
    specs:{
      screen:{ar:"شاشة AMOLED 1.96 بوصة",en:"1.96\" AMOLED Display"},
      gps:{ar:"GPS مدمج",en:"Built-in GPS"},
      waterproof:{ar:"IP68",en:"IP68 Water Resistant"},
      battery:{ar:"7 أيام",en:"7 Days Battery"},
      health:{ar:"SpO2 + ضغط الدم",en:"SpO2 + Blood Pressure"}
    },
    sell:[
      {ar:"GPS حقيقي بدون هاتف",en:"True GPS without phone"},
      {ar:"شاشة AMOLED أوضح تحت الشمس",en:"AMOLED clearest in sunlight"},
      {ar:"الأقوى مقارنة بـ Samsung & Huawei بنفس السعر",en:"Outperforms Samsung & Huawei at same price"}
    ],
    compare:{
      model:"Samsung Galaxy Watch 4",
      price:{ar:"حوالي 8000 جنيه",en:"≈8000 EGP"},
      points:[
        {ar:"نفس GPS بسعر أقل",en:"Same GPS at lower price"},
        {ar:"AMOLED بنفس الجودة",en:"Same quality AMOLED"},
        {ar:"بطارية أطول",en:"Longer battery life"}
      ]
    }
  },
  {
    name:"Oraimo Smart Watch Nova2 OSW814", code:"OSW814",
    cat:"⌚ Smart Watch", img:"⌚", color:"#00C853", price:2326,
    specs:{
      screen:{ar:"شاشة 1.85 بوصة IPS",en:"1.85\" IPS Display"},
      waterproof:{ar:"IP68",en:"IP68"},
      sports:{ar:"120+ وضع رياضي",en:"120+ Sports Modes"},
      battery:{ar:"10 أيام",en:"10 Days Battery"},
      notify:{ar:"إشعارات واتساب وفيسبوك",en:"WhatsApp & Facebook notifications"}
    },
    sell:[
      {ar:"10 أيام بطارية — ضعف Apple Watch",en:"10-day battery — double Apple Watch"},
      {ar:"120 وضع رياضي لكل الأنشطة",en:"120 sports modes for all activities"},
      {ar:"تصميم رفيع أنيق",en:"Slim elegant design"}
    ],
    compare:{
      model:"Xiaomi Smart Band 8 Pro",
      price:{ar:"حوالي 2500 جنيه",en:"≈2500 EGP"},
      points:[
        {ar:"بطارية أطول",en:"Longer battery"},
        {ar:"شاشة أكبر",en:"Larger screen"},
        {ar:"سعر أقل أو متقارب",en:"Lower or equal price"}
      ]
    }
  },
  {
    name:"Oraimo Smart Watch OSW-810", code:"OSW-810",
    cat:"⌚ Smart Watch", img:"⌚", color:"#FF6D00", price:1988,
    specs:{
      screen:{ar:"شاشة AMOLED 1.43 بوصة",en:"1.43\" AMOLED"},
      aod:{ar:"Always On Display",en:"Always On Display"},
      waterproof:{ar:"IP68",en:"IP68"},
      battery:{ar:"14 يوم",en:"14 Days Battery"},
      design:{ar:"تصميم مستدير فاخر",en:"Premium round design"}
    },
    sell:[
      {ar:"AMOLED مع AOD — يظهر الوقت دائماً",en:"AMOLED + AOD — always shows time"},
      {ar:"14 يوم بطارية — غير مسبوق",en:"14-day battery — unprecedented"},
      {ar:"تصميم مستدير كالساعات الكلاسيكية",en:"Round design like classic watches"}
    ],
    compare:{
      model:"Amazfit GTR 3",
      price:{ar:"حوالي 3000 جنيه",en:"≈3000 EGP"},
      points:[
        {ar:"سعر أقل بفرق كبير",en:"Much lower price"},
        {ar:"بطارية أطول (14d vs 12d)",en:"Longer battery (14d vs 12d)"},
        {ar:"AMOLED بنفس الجودة",en:"Same AMOLED quality"}
      ]
    }
  },

  /* ========================= 🔌 CABLE ========================= */
  {
    name:"Oraimo Cable C to C 3M 100W OCD-173CC", code:"OCD-173CC",
    cat:"🔌 Cable", img:"🔌", color:"#607D8B", price:366,
    specs:{
      length:{ar:"3 متر",en:"3 Meters"},
      power:{ar:"100W PD",en:"100W PD"},
      durability:{ar:"20,000 انحناء",en:"20,000 bends durability"},
      material:{ar:"نايلون مضفر",en:"Braided nylon"},
      laptop:{ar:"متوافق مع MacBook",en:"MacBook compatible"}
    },
    sell:[
      {ar:"3 متر — مثالي للسرير والمكتب",en:"3m — perfect for bed & desk"},
      {ar:"100W يكفي لشحن لاب توب",en:"100W enough for laptop charging"},
      {ar:"نايلون لا يتقصف أبداً",en:"Braided nylon never frays"},
      {ar:"الكابل الأطول والأقوى في الفئة",en:"Longest & strongest in class"}
    ],
    compare:{
      model:"Anker 100W USB-C Cable",
      price:{ar:"حوالي 600 جنيه",en:"≈600 EGP"},
      points:[
        {ar:"نفس الجودة بسعر أقل",en:"Same quality at lower price"},
        {ar:"طول أطول (3m vs 1.8m)",en:"Longer (3m vs 1.8m)"}
      ]
    }
  }
];

// ── Q1 2026 STORES SNAPSHOT ──
