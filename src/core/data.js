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


// ── BACK BUTTON — handled in bootstrap.js ──

// ── SPLASH & INIT ──
(async function initApp(){

// ── MANAGERS (team leaders) ──
const MANAGERS = [
  {name: 'عبد الله فتحي'},
  {name: 'عبد الرحمن سامي'},
  {name: 'وليد رجب'}
];

// ── MARCH BASELINE (for projections) ──
const MARCH_DAYS_RECORDED = 11;
const MARCH_FULL_DAYS = 31;

// ── Q1 HISTORICAL DATA (Jan/Feb/Mar) ──
const Q1_STORES = [{"store": "B.ONLINE", "jan": 197623, "feb": 113359, "mar_actual": 227006, "mar_projected": 639745, "mar_daily": 20637, "qty_jan": 306, "qty_feb": 146, "qty_mar": 281}, {"store": "NEW IMBABA", "jan": 123144, "feb": 73558, "mar_actual": 112671, "mar_projected": 317528, "mar_daily": 10243, "qty_jan": 142, "qty_feb": 81, "qty_mar": 133}, {"store": "Banha_Mega_Store", "jan": 172436, "feb": 135398, "mar_actual": 109798, "mar_projected": 309432, "mar_daily": 9982, "qty_jan": 217, "qty_feb": 145, "qty_mar": 122}, {"store": "El kanater", "jan": 99488, "feb": 64523, "mar_actual": 109656, "mar_projected": 309031, "mar_daily": 9969, "qty_jan": 114, "qty_feb": 76, "qty_mar": 137}, {"store": "Qena", "jan": 75329, "feb": 51108, "mar_actual": 95089, "mar_projected": 267977, "mar_daily": 8644, "qty_jan": 102, "qty_feb": 69, "qty_mar": 104}, {"store": "Shobra", "jan": 115590, "feb": 95317, "mar_actual": 84942, "mar_projected": 239383, "mar_daily": 7722, "qty_jan": 135, "qty_feb": 102, "qty_mar": 102}, {"store": "26th July", "jan": 55830, "feb": 56664, "mar_actual": 83476, "mar_projected": 235249, "mar_daily": 7589, "qty_jan": 81, "qty_feb": 68, "qty_mar": 94}, {"store": "V_Badr", "jan": 87611, "feb": 63850, "mar_actual": 81337, "mar_projected": 229222, "mar_daily": 7394, "qty_jan": 120, "qty_feb": 87, "qty_mar": 91}, {"store": "Oraby", "jan": 91147, "feb": 80183, "mar_actual": 73120, "mar_projected": 206066, "mar_daily": 6647, "qty_jan": 120, "qty_feb": 100, "qty_mar": 89}, {"store": "El Zaher", "jan": 95449, "feb": 72912, "mar_actual": 67176, "mar_projected": 189315, "mar_daily": 6107, "qty_jan": 124, "qty_feb": 81, "qty_mar": 75}, {"store": "Dar El Salam", "jan": 75694, "feb": 49383, "mar_actual": 64733, "mar_projected": 182430, "mar_daily": 5885, "qty_jan": 106, "qty_feb": 63, "qty_mar": 73}, {"store": "ElSoudan Street", "jan": 98822, "feb": 73439, "mar_actual": 64544, "mar_projected": 181897, "mar_daily": 5868, "qty_jan": 147, "qty_feb": 90, "qty_mar": 80}, {"store": "El Helmya", "jan": 32687, "feb": 37590, "mar_actual": 59983, "mar_projected": 169044, "mar_daily": 5453, "qty_jan": 39, "qty_feb": 48, "qty_mar": 72}, {"store": "HQ Call Center stop", "jan": 47274, "feb": 32927, "mar_actual": 55998, "mar_projected": 157813, "mar_daily": 5091, "qty_jan": 59, "qty_feb": 41, "qty_mar": 55}, {"store": "Luxor_2", "jan": 7053, "feb": 13930, "mar_actual": 53610, "mar_projected": 151082, "mar_daily": 4874, "qty_jan": 10, "qty_feb": 20, "qty_mar": 67}, {"store": "Qalyub", "jan": 125660, "feb": 67384, "mar_actual": 50588, "mar_projected": 142565, "mar_daily": 4599, "qty_jan": 155, "qty_feb": 83, "qty_mar": 59}, {"store": "Maadi2", "jan": 87757, "feb": 69490, "mar_actual": 48514, "mar_projected": 136721, "mar_daily": 4410, "qty_jan": 100, "qty_feb": 83, "qty_mar": 58}, {"store": "V_Hassan El Maamon", "jan": 46472, "feb": 41026, "mar_actual": 45658, "mar_projected": 128672, "mar_daily": 4151, "qty_jan": 76, "qty_feb": 52, "qty_mar": 77}, {"store": "V_El Tahrir", "jan": 71262, "feb": 83263, "mar_actual": 45196, "mar_projected": 127370, "mar_daily": 4109, "qty_jan": 94, "qty_feb": 111, "qty_mar": 47}, {"store": "P_Mall Of October", "jan": 53983, "feb": 24440, "mar_actual": 43342, "mar_projected": 122146, "mar_daily": 3940, "qty_jan": 78, "qty_feb": 30, "qty_mar": 61}, {"store": "P_Mega Helwan", "jan": 94528, "feb": 43062, "mar_actual": 40965, "mar_projected": 115447, "mar_daily": 3724, "qty_jan": 120, "qty_feb": 59, "qty_mar": 55}, {"store": "Faisal", "jan": 84038, "feb": 38814, "mar_actual": 40944, "mar_projected": 115387, "mar_daily": 3722, "qty_jan": 125, "qty_feb": 58, "qty_mar": 59}, {"store": "P_Town Center El Salam", "jan": 17490, "feb": 51290, "mar_actual": 34126, "mar_projected": 96174, "mar_daily": 3102, "qty_jan": 38, "qty_feb": 77, "qty_mar": 66}, {"store": "P_Sky Mall El Sherouk", "jan": 51303, "feb": 30981, "mar_actual": 32255, "mar_projected": 90901, "mar_daily": 2932, "qty_jan": 65, "qty_feb": 44, "qty_mar": 40}, {"store": "V_Bani Suef", "jan": 59487, "feb": 27117, "mar_actual": 31795, "mar_projected": 89604, "mar_daily": 2890, "qty_jan": 85, "qty_feb": 37, "qty_mar": 41}, {"store": "Fakous", "jan": 44796, "feb": 34594, "mar_actual": 30950, "mar_projected": 87223, "mar_daily": 2814, "qty_jan": 65, "qty_feb": 54, "qty_mar": 40}, {"store": "2Ain Shams", "jan": 18575, "feb": 39369, "mar_actual": 30815, "mar_projected": 86842, "mar_daily": 2801, "qty_jan": 25, "qty_feb": 50, "qty_mar": 44}, {"store": "V_Gesr El Suez", "jan": 21504, "feb": 42762, "mar_actual": 29146, "mar_projected": 82138, "mar_daily": 2650, "qty_jan": 28, "qty_feb": 56, "qty_mar": 37}, {"store": "P_Mall OF Egypt", "jan": 10406, "feb": 13641, "mar_actual": 27785, "mar_projected": 78304, "mar_daily": 2526, "qty_jan": 22, "qty_feb": 27, "qty_mar": 43}, {"store": "AKKAD", "jan": 46026, "feb": 39628, "mar_actual": 27187, "mar_projected": 76618, "mar_daily": 2472, "qty_jan": 67, "qty_feb": 41, "qty_mar": 38}, {"store": "Domyat", "jan": 34611, "feb": 30361, "mar_actual": 26771, "mar_projected": 75446, "mar_daily": 2434, "qty_jan": 47, "qty_feb": 39, "qty_mar": 31}, {"store": "Delta_Berket_ElSabaa", "jan": 15154, "feb": 29662, "mar_actual": 25560, "mar_projected": 72032, "mar_daily": 2324, "qty_jan": 24, "qty_feb": 35, "qty_mar": 25}, {"store": "V_Dokki", "jan": 21334, "feb": 12485, "mar_actual": 25069, "mar_projected": 70650, "mar_daily": 2279, "qty_jan": 29, "qty_feb": 17, "qty_mar": 31}, {"store": "El Menia Mega Store", "jan": 43286, "feb": 29044, "mar_actual": 24868, "mar_projected": 70081, "mar_daily": 2261, "qty_jan": 56, "qty_feb": 40, "qty_mar": 30}, {"store": "P_Mega Shubra El Kheima", "jan": 105198, "feb": 49710, "mar_actual": 23921, "mar_projected": 67414, "mar_daily": 2175, "qty_jan": 154, "qty_feb": 61, "qty_mar": 34}, {"store": "V_Obour2", "jan": 32595, "feb": 30368, "mar_actual": 23904, "mar_projected": 67367, "mar_daily": 2173, "qty_jan": 42, "qty_feb": 31, "qty_mar": 24}, {"store": "V_City Center Maadi", "jan": 45347, "feb": 28878, "mar_actual": 23211, "mar_projected": 65412, "mar_daily": 2110, "qty_jan": 58, "qty_feb": 31, "qty_mar": 27}, {"store": "V_Maadi Grand Mall", "jan": 21932, "feb": 19924, "mar_actual": 22928, "mar_projected": 64616, "mar_daily": 2084, "qty_jan": 30, "qty_feb": 29, "qty_mar": 39}, {"store": "New Domyat", "jan": 18703, "feb": 10689, "mar_actual": 22824, "mar_projected": 64322, "mar_daily": 2075, "qty_jan": 29, "qty_feb": 15, "qty_mar": 32}, {"store": "Desouk", "jan": 29519, "feb": 16253, "mar_actual": 22574, "mar_projected": 63617, "mar_daily": 2052, "qty_jan": 40, "qty_feb": 22, "qty_mar": 28}, {"store": "V_Kafr ElSheikh", "jan": 32283, "feb": 21247, "mar_actual": 22273, "mar_projected": 62769, "mar_daily": 2025, "qty_jan": 47, "qty_feb": 29, "qty_mar": 27}, {"store": "Mall Of Arabia", "jan": 7229, "feb": 789, "mar_actual": 22077, "mar_projected": 62218, "mar_daily": 2007, "qty_jan": 10, "qty_feb": 2, "qty_mar": 27}, {"store": "New Sohag", "jan": 24387, "feb": 31973, "mar_actual": 21957, "mar_projected": 61879, "mar_daily": 1996, "qty_jan": 41, "qty_feb": 47, "qty_mar": 28}, {"store": "V_Ismailia Square", "jan": 2668, "feb": 1095, "mar_actual": 20724, "mar_projected": 58403, "mar_daily": 1884, "qty_jan": 5, "qty_feb": 2, "qty_mar": 23}, {"store": "V_El Sherouk", "jan": 20501, "feb": 17436, "mar_actual": 20421, "mar_projected": 57550, "mar_daily": 1856, "qty_jan": 29, "qty_feb": 23, "qty_mar": 22}, {"store": "V_Elmenia", "jan": 20281, "feb": 5386, "mar_actual": 19571, "mar_projected": 55155, "mar_daily": 1779, "qty_jan": 30, "qty_feb": 10, "qty_mar": 24}, {"store": "Malawi", "jan": 21904, "feb": 31543, "mar_actual": 18488, "mar_projected": 52102, "mar_daily": 1681, "qty_jan": 30, "qty_feb": 41, "qty_mar": 24}, {"store": "Ain Shams", "jan": 12988, "feb": 47120, "mar_actual": 18227, "mar_projected": 51368, "mar_daily": 1657, "qty_jan": 20, "qty_feb": 55, "qty_mar": 20}, {"store": "Misr Al Gadida", "jan": 24931, "feb": 20727, "mar_actual": 18175, "mar_projected": 51222, "mar_daily": 1652, "qty_jan": 29, "qty_feb": 21, "qty_mar": 27}, {"store": "New Roxy", "jan": 4819, "feb": 5388, "mar_actual": 14664, "mar_projected": 41326, "mar_daily": 1333, "qty_jan": 6, "qty_feb": 8, "qty_mar": 24}]

// ── ORAIMO SPECS DATABASE (21 models) ──
const ORAIMO_SPECS = [
  {
    name:"Oraimo Smart Watch OSW-850H",price:6906,cat:"⌚ Smartwatch",
    img:"⌚",color:"#FFD700",
    specs:["شاشة AMOLED 1.96 بوصة","GPS مدمج","مقاومة للماء IP68","بطارية 7 أيام","قياس SpO2 وضغط الدم"],
    sell:["أعلى ساعة في الفئة","GPS حقيقي بدون هاتف","شاشة أوضح تحت الشمس","الأقوى مقارنة بـ Samsung & Huawei بنفس السعر"]
  },
  {
    name:"Oraimo Smart Watch Nova2 OSW814",price:2326,cat:"⌚ Smartwatch",
    img:"⌚",color:"#00C853",
    specs:["شاشة 1.85 بوصة IPS","مقاومة IP68","120+ وضع رياضي","بطارية 10 أيام","إشعارات واتساب وفيسبوك"],
    sell:["أفضل قيمة في سعرها","10 أيام بطارية — ضعف Apple Watch","120 وضع رياضي لكل الأنشطة","تصميم رفيع أنيق"]
  },
  {
    name:"Oraimo Smart Watch OSW-30",price:1517,cat:"⌚ Smartwatch",
    img:"⌚",color:"#2979FF",
    specs:["شاشة كبيرة 2.01 بوصة","ضغط دم وأكسجين","بطارية 7 أيام","مقاومة IP67","مكالمات بلوتوث"],
    sell:["أكبر شاشة في الفئة","مكالمات مباشرة من الساعة","سعر لا يُقاوَم","مثالية كهدية"]
  },
  {
    name:"Oraimo Smart Watch OSW-42",price:1862,cat:"⌚ Smartwatch",
    img:"⌚",color:"#9c27b0",
    specs:["شاشة 1.95 بوصة","مكالمات بلوتوث","قياس ضغط دم وأكسجين","بطارية 7 أيام","100+ وضع رياضي"],
    sell:["مكالمات بلوتوث عالية الجودة","تصميم مميز وعصري","ملحقات متعددة الألوان","أفضل من Mi Band بكثير"]
  },
  {
    name:"Oraimo Smart Watch OSW-810",price:1988,cat:"⌚ Smartwatch",
    img:"⌚",color:"#FF6D00",
    specs:["شاشة AMOLED 1.43 بوصة","Always On Display","مقاومة IP68","بطارية 14 يوم","تصميم مستدير فاخر"],
    sell:["شاشة AMOLED الأوضح","14 يوم بطارية — غير مسبوق","تصميم مستدير كالساعات الكلاسيكية","AOD يظهر الوقت دائماً"]
  },
  {
    name:"Oraimo TWS OTW-930",price:3954,cat:"🎧 إيرباد",
    img:"🎧",color:"#FF3B3B",
    specs:["ANC إلغاء ضوضاء نشط","بطارية 40 ساعة مع الكيس","مقاومة IPX5","لاتنس منخفض للألعاب","تقنية ENC للمكالمات"],
    sell:["ANC ينافس AirPods Pro بسعر 4x أقل","40 ساعة — أطول بطارية في الفئة","صوت ممتاز للمحتوى والمكالمات","مثالية للطلاب والموظفين"]
  },
  {
    name:"Oraimo TWS OpenArc OPN675",price:3024,cat:"🎧 إيرباد",
    img:"🎧",color:"#00BCD4",
    specs:["Open-ear بدون سد الأذن","بطارية 60 ساعة مع الكيس","صوت ستيريو واسع","تصميم hook مريح","للرياضة والاستخدام اليومي"],
    sell:["60 ساعة — الأطول في السوق","Open-ear صحي للأذن — لا يسبب ضغط","مثالية للرياضيين وقيادة السيارة","صوت طبيعي وواضح"]
  },
  {
    name:"Oraimo TWS Openpods OPN-50D",price:2209,cat:"🎧 إيرباد",
    img:"🎧",color:"#8BC34A",
    specs:["Open-ear تصميم عصري","بطارية 30 ساعة","اتصال فوري","ميكروفون واضح","مريح للاستخدام الطويل"],
    sell:["تصميم Open-ear الأكثر أماناً","لا تسقط أثناء الرياضة","مناسبة لكل أحجام الأذن","الأفضل مع Oraimo Watch كبرومو"]
  },
  {
    name:"Oraimo TWS OEB-E108D",price:2095,cat:"🎧 إيرباد",
    img:"🎧",color:"#FF4081",
    specs:["ANC إلغاء ضوضاء","بطارية 35 ساعة","شاشة LED بالكيس","ENC للمكالمات","مقاومة IPX5"],
    sell:["ANC بسعر اقتصادي جداً","شاشة الكيس تُظهر نسبة البطارية","35 ساعة كافية لرحلات طويلة","أفضل من سامسونج Buds2 بنفس السعر"]
  },
  {
    name:"Oraimo Neckband OEB611 ANC",price:1396,cat:"🎧 إيرباد",
    img:"🎧",color:"#795548",
    specs:["ANC إلغاء ضوضاء","بطارية 30 ساعة","مقاومة للماء","تصميم neckband مريح","ENC للمكالمات"],
    sell:["ANC في neckband — نادر جداً","30 ساعة لا تنتهي","لا تقع من الأذن أبداً","مثالية للموصلات والعمل الطويل"]
  },
  {
    name:"Oraimo BT Headphone OHP-610S",price:1517,cat:"🎧 هيدفون",
    img:"🎧",color:"#607D8B",
    specs:["Over-ear مريح","بطارية 40 ساعة","بلوتوث 5.3","ميكروفون مدمج","قابل للطي"],
    sell:["40 ساعة للطلاب والمذاكرة","صوت محيطي ممتاز","قابل للطي ومناسب للسفر","أرخص من Sony & JBL بمواصفات مقاربة"]
  },
  {
    name:"Oraimo PowerJet 130 OPB-727SQ 27600mAh",price:3499,cat:"🔋 باور بانك",
    img:"🔋",color:"#FFD700",
    specs:["27600 mAh سعة ضخمة","شحن 65W سريع","3 منافذ USB","شاشة رقمية","يشحن لاب توب"],
    sell:["يشحن لاب توب + موبايل معاً","65W — أسرع شحن في الفئة","يكفي لرحلات أسبوع كامل","أقوى من Anker بنفس السعر"]
  },
  {
    name:"Oraimo PowerNova L21 OPB-7203C 30W 20K",price:1749,cat:"🔋 باور بانك",
    img:"🔋",color:"#00C853",
    specs:["20000 mAh","شحن PD 30W","منفذ Type-C وUSB-A","شحن الموبايل 4 مرات","رفيع وخفيف الوزن"],
    sell:["30W PD — يشحن iPhone في ساعة","20000 رفيع وخفيف للحمل اليومي","يشحن الموبايل 4-5 مرات كاملة","أفضل قيمة في السوق المصري"]
  },
  {
    name:"Oraimo P.Bank OPB-7103C 22.5W 10K",price:1279,cat:"🔋 باور بانك",
    img:"🔋",color:"#2979FF",
    specs:["10000 mAh","22.5W سريع","منفذ USB-C وUSB-A","شاشة رقمية","حجم صغير جداً"],
    sell:["الأصغر حجماً في فئة 10000","22.5W يشحن أسرع من معظم المنافسين","شاشة رقمية تُظهر نسبة الشحن الدقيقة","مثالية للفتيات والطلاب"]
  },
  {
    name:"Oraimo Wireless Speaker SpaceBox Pro 80W OBS682",price:4604,cat:"🔊 سبيكر",
    img:"🔊",color:"#FF6D00",
    specs:["80W صوت قوي جداً","بطارية 12 ساعة","مقاومة IPX6","LED ملونة","صوت ستيريو 360°"],
    sell:["80W يملأ أي غرفة أو حفلة","IPX6 للحفلات الخارجية والشاطئ","LED جميلة تضيف أجواء","أقوى من JBL Xtreme بسعر أقل"]
  },
  {
    name:"Oraimo Portable Speaker OBS382",price:1165,cat:"🔊 سبيكر",
    img:"🔊",color:"#E91E63",
    specs:["20W صوت واضح","بطارية 12 ساعة","مقاومة IPX5","بلوتوث 5.3","حمل مريح"],
    sell:["20W للاستخدام الشخصي والسفر","IPX5 للشاطئ والرياضة","صوت أوضح من JBL Go3","أفضل هدية عملية"]
  },
  {
    name:"Oraimo OCW-5451ECC 45W GaN Ultra PD",price:599,cat:"⚡ شاحن",
    img:"⚡",color:"#FF3B3B",
    specs:["GaN تقنية متقدمة","45W PD سريع جداً","منفذ USB-C وUSB-A","حجم صغير جداً","يشحن MacBook"],
    sell:["GaN — أصغر بـ60% من الشواحن العادية","45W يشحن iPhone من 0-80% في 35 دقيقة","يشحن MacBook Air بكفاءة","مثالي للمسافرين"]
  },
  {
    name:"Oraimo Charger OCW7331E 33W GaN Fast Dual",price:466,cat:"⚡ شاحن",
    img:"⚡",color:"#9c27b0",
    specs:["33W GaN","منفذان USB-C + USB-A","حجم كبريت تقريباً","شحن سريع QC","متوافق مع جميع الأجهزة"],
    sell:["شاحن + كابل = حزمة مثالية","GaN يوفر الكهرباء ويقلل السخونة","منفذان لشحن جهازين معاً","أصغر شاحن 33W في السوق"]
  },
  {
    name:"Oraimo Car Charger 48W OCC73D",price:466,cat:"⚡ شاحن سيارة",
    img:"⚡",color:"#FF9800",
    specs:["48W للسيارة","منفذ USB-C PD وUSB-A","يشحن الموبايل سريعاً","تصميم أنيق","مؤشر LED"],
    sell:["48W — أسرع شاحن سيارة Oraimo","يشحن iPhone من 0-50% في 30 دقيقة","يناسب كل السيارات","هدية مثالية لأصحاب السيارات"]
  },
  {
    name:"Oraimo Wireless Charger 15W OWH-1151",price:576,cat:"⚡ شاحن لاسلكي",
    img:"⚡",color:"#00BCD4",
    specs:["15W شحن لاسلكي","متوافق Qi مع iPhone وSamsung","LED مؤشر","حجم رفيع","لا يسخن"],
    sell:["15W — أسرع من Apple MagSafe الأصلي","يشحن عبر الجراب (حتى 5mm)","لا حاجة لفك الجراب","سعر أقل من Apple و Samsung بنفس الجودة"]
  },
  {
    name:"Oraimo Cable C to C 3M 100W OCD-173CC",price:366,cat:"🔌 كابل",
    img:"🔌",color:"#607D8B",
    specs:["طول 3 متر","100W PD","تحمل يصل لـ 20,000 انحناء","مادة نايلون مضفر","متوافق مع MacBook"],
    sell:["3 متر — مثالي للاستخدام في السرير أو المكتب","100W يكفي لشحن لاب توب","نايلون لا يتقصف أبداً","الكابل الأطول والأقوى في الفئة"]
  }
];

// ── Q1 2026 STORES SNAPSHOT (for loadQ1Analytics in ui.js) ──
;
