export const SHOP_NAMES = [
  ['新町食堂', 'SHINMACHI DINING', '#e8d4a0', '#282820'], ['らーめん', 'RAMEN · OPEN LATE', '#c73e27', '#fff0ce'],
  ['喫茶 月光', 'COFFEE & KISSA', '#174c48', '#eddeb5'], ['まるや商店', 'FRESH FOOD MARKET', '#f5eee0', '#286649'],
  ['カラオケ', 'KARAOKE  3F', '#b2385b', '#fff4d1'], ['居酒屋 鳥吉', 'YAKITORI · SAKE', '#272a28', '#efc77c'],
  ['新町薬局', 'PHARMACY', '#eeeacb', '#31826d'], ['ゲーム館', 'GAME / ELECTRONICS', '#234a8b', '#f1f5eb'],
  ['東京カメラ', 'TOKYO CAMERA', '#c8352d', '#fff0dd'], ['蕎麦  田中', 'SOBA · SINCE 1968', '#ded7bc', '#293b32'],
  ['本と珈琲', 'BOOKS & COFFEE', '#394c44', '#efe2b7'], ['サクラ不動産', 'SAKURA REAL ESTATE', '#e5ded1', '#31649a'],
  ['青空マート', 'AOZORA MART  24H', '#f4f0df', '#147a66'], ['美容室 花', 'HAIR STUDIO  2F', '#ac666d', '#fff2da'],
  ['焼肉 牛亭', 'YAKINIKU  2F', '#6a2424', '#f5d399'], ['新町ビル', 'SHINMACHI BUILDING', '#233642', '#c8e0dc'],
  ['新町駅', 'SHINMACHI STATION', '#f0ede1', '#285e4a'], ['止まれ', 'STOP', '#b52e2d', '#fff4e1'],
  ['P  駐車場', 'PARKING  ¥300 / 30 MIN', '#173a5e', '#ffdc5c'], ['自転車置場', 'BICYCLE PARKING', '#e5e4d5', '#325b55'],
  ['お弁当', 'BENTO · TAKE AWAY', '#de8b30', '#fff2d9'], ['たこ焼', 'TAKOYAKI', '#d95031', '#ffedd0'],
  ['古書 新町堂', 'USED BOOKS', '#beaa7e', '#3b3328'], ['東口商店街', 'SHINMACHI SHOPPING STREET', '#214c4e', '#f5d49a'],
  ['らーめん', '', '#e3472e', '#fff1d0'], ['居酒屋', '', '#eac795', '#502a22'],
  ['カラオケ', '', '#c94972', '#fff5ec'], ['電気館', '', '#194683', '#e9ebcd'],
  ['焼肉', '', '#a93431', '#ffe5a8'], ['喫茶', '', '#34645d', '#eddec0'],
  ['営業中', 'OPEN', '#f2d0a3', '#b73e2d'], ['新町通り', 'SHINMACHI DORI', '#275b88', '#fff9e8'],
];

export const KONBINI_SIGNS = { fascia: 32, coffee: 33, fresh: 34, services: 35, door: 36, drinks: 37, groceries: 38, price: 39, hours: 40 } as const;
export const NEIGHBORHOOD_SIGNS={walkup:41,mansion:42,residence:43,apartments:44,directory:45} as const;
export const SIGN_NAMES: readonly (readonly string[])[] = [...SHOP_NAMES,
  ['青空マート', 'AOZORA MART   /   24 HOURS', '#e5eadc', '#123e43'],
  ['挽きたて珈琲', 'AOZORA COFFEE   120円', '#f2e1b3', '#20494b'],
  ['おにぎり・お弁当', '毎日できたて   /   青空マート', '#e6e4cd', '#20494b'],
  ['ATM・宅配便', '公共料金・切手', '#1b5054', '#f2e8cc'],
  ['自動ドア', '足もとにご注意ください', '#e1e9e3', '#173d42'],
  ['冷たい飲み物', 'DRINKS   /   青空マート', '#1b5054', '#e9eddf'],
  ['お菓子・日用品', 'GROCERIES   /   青空マート', '#1b5054', '#e9eddf'],
  ['青空のお買得', '税込 128円   /   158円   /   198円', '#eae4cb', '#7b3427'],
  ['24', '時間営業', '#e5eadc', '#123e43'],
  ['東町荘', 'HIGASHI APARTMENTS', '#b9b4a2', '#34483d'],
  ['青葉ハイツ', 'AOBA HEIGHTS', '#746357', '#ede3cb'],
  ['東町住宅', 'HIGASHI RESIDENCES', '#d2c6aa', '#3b443b'],
  ['新町レジデンス', 'SHINMACHI RESIDENCE', '#71817e', '#eae5d8'],
  ['テナント案内', 'TENANT DIRECTORY', '#d7d6c8', '#2a4043'],
];
/** Display identity never depends on the sign format or an unrelated modulo lookup. */
export function storefrontSign(kind: string, shop: number): number {
  return kind === 'convenience' ? 12 : kind === 'apartment' || kind === 'office' ? 15 : shop;
}
