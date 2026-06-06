import type { MealNutritionProfile } from '../types'
import { MAIN_PROTEIN_IDS, STAPLE_CARB_IDS } from './nutritionCategories'

export interface Recipe {
  id: string
  name: string
  requiredIngredientIds: string[]
  summary: string
  steps: string[]
  /** 是否为仅主食说明（不参与常规推荐） */
  stapleOnly?: boolean
  /** 不含碳水的主菜（适合不吃碳水） */
  lowCarb?: boolean
  /** 同组食材时优先作为默认推荐 */
  preferFeatured?: boolean
  /** 适合早餐推荐 */
  breakfastFriendly?: boolean
  /** 午晚餐主菜（早餐排除） */
  dinnerMain?: boolean
}

export const RECIPE_LIBRARY: Recipe[] = [
  {
    id: 'tomato-scrambled-egg',
    name: '番茄炒蛋',
    requiredIngredientIds: ['egg', 'tomato'],
    preferFeatured: true,
    lowCarb: true,
    summary: '经典家常菜，酸甜嫩滑。',
    steps: [
      '番茄切块，鸡蛋加少许盐打散。',
      '热锅少油，先炒蛋至凝固盛出。',
      '再炒番茄出汁，倒回鸡蛋翻炒均匀，盐调味即可。',
    ],
  },
  {
    id: 'tomato-egg-drop-soup',
    name: '番茄蛋花汤',
    requiredIngredientIds: ['egg', 'tomato'],
    breakfastFriendly: true,
    lowCarb: true,
    summary: '清淡汤品，番茄蛋花分明。',
    steps: [
      '番茄切块，锅中加清水煮开。',
      '下番茄煮软，淋入打散的蛋液形成蛋花。',
      '加盐、少许香油调味即可盛出。',
    ],
  },
  {
    id: 'tomato-egg-rice-bowl',
    name: '番茄鸡蛋盖饭',
    requiredIngredientIds: ['egg', 'tomato', 'rice'],
    dinnerMain: true,
    summary: '番茄炒蛋浇在热米饭上，饱腹均衡。',
    steps: [
      '大米淘洗后按 1:1.2 加水煮成米饭，盛入碗中。',
      '另起锅做番茄炒蛋：炒蛋盛出，炒番茄出汁后倒回鸡蛋。',
      '将番茄炒蛋浇在米饭上，可按口味淋少许生抽。',
    ],
  },
  {
    id: 'tomato-egg-noodles',
    name: '番茄鸡蛋拌面',
    requiredIngredientIds: ['egg', 'tomato'],
    lowCarb: false,
    summary: '番茄鸡蛋卤拌面条，酸香开胃。（需自备面条）',
    steps: [
      '面条按包装说明煮至断生，捞出过凉水沥干。',
      '番茄切块，鸡蛋打散；热锅炒蛋盛出，再炒番茄出汁。',
      '番茄鸡蛋卤浇在面条上拌匀，加盐、葱花即可。',
    ],
  },
  {
    id: 'chicken-broccoli-stir-fry',
    name: '西兰花炒鸡胸',
    requiredIngredientIds: ['chicken-breast', 'broccoli'],
    dinnerMain: true,
    lowCarb: true,
    summary: '高蛋白低脂，少油快炒。',
    steps: [
      '鸡胸切片，用盐、胡椒略腌；西兰花焯水沥干。',
      '热锅少油滑炒鸡胸至变色，下西兰花。',
      '生抽少许、蒜蓉（可选）快炒出锅。',
    ],
  },
  {
    id: 'steamed-chicken-broccoli',
    name: '清蒸鸡胸配西兰花',
    requiredIngredientIds: ['chicken-breast', 'broccoli'],
    lowCarb: true,
    summary: '清蒸做法，低脂高蛋白。',
    steps: [
      '鸡胸用盐、姜腌制，西兰花切小朵。',
      '水开后鸡胸蒸约 12 分钟，西兰花蒸 5 分钟。',
      '淋少许蒸鱼豉油或热油激香即可。',
    ],
  },
  {
    id: 'chicken-rice-bowl',
    name: '鸡胸盖饭',
    requiredIngredientIds: ['chicken-breast', 'rice'],
    dinnerMain: true,
    summary: '煎香鸡胸配热米饭。',
    steps: [
      '大米淘洗煮熟，盛入碗中。',
      '鸡胸两面煎至金黄，切片铺在米饭上。',
      '可加生抽、黑胡椒或照烧汁调味。',
    ],
  },
  {
    id: 'beef-tomato-stew',
    name: '番茄炖牛肉',
    requiredIngredientIds: ['beef', 'tomato'],
    dinnerMain: true,
    lowCarb: true,
    summary: '番茄酸香炖牛肉，软烂入味。',
    steps: [
      '牛肉切块焯水，番茄切块。',
      '炒香葱姜（可选），下牛肉翻炒，加番茄与热水。',
      '小火炖 1～1.5 小时至软烂，盐调味。',
    ],
  },
  {
    id: 'beef-broccoli',
    name: '西兰花炒牛肉',
    requiredIngredientIds: ['beef', 'broccoli'],
    dinnerMain: true,
    lowCarb: true,
    summary: '快手小炒，荤素搭配。',
    steps: [
      '牛肉逆纹切片，淀粉、生抽抓腌。',
      '西兰花焯水；热锅快炒牛肉至变色盛出。',
      '炒西兰花后倒回牛肉，蚝油调味炒匀。',
    ],
  },
  {
    id: 'egg-fried-rice',
    name: '蛋炒饭',
    requiredIngredientIds: ['egg', 'rice'],
    dinnerMain: true,
    summary: '鸡蛋与米饭同炒，一锅主食。',
    steps: [
      '米饭拨散，鸡蛋炒散盛出。',
      '热油下米饭炒散，加盐与蛋液翻匀。',
      '可撒葱花增香，炒至粒粒分明出锅。',
    ],
  },
  {
    id: 'broccoli-garlic',
    name: '蒜蓉西兰花',
    requiredIngredientIds: ['broccoli'],
    lowCarb: true,
    summary: '清炒蔬菜，搭配主菜。',
    steps: [
      '西兰花掰小朵焯水 1 分钟捞出。',
      '蒜末爆香，下西兰花快炒，盐调味即可。',
    ],
  },
  {
    id: 'shrimp-steamed-egg',
    name: '虾仁蒸蛋',
    requiredIngredientIds: ['shrimp', 'egg'],
    breakfastFriendly: true,
    preferFeatured: true,
    lowCarb: true,
    summary: '嫩滑蒸蛋配虾仁，早餐高蛋白。',
    steps: [
      '鸡蛋加温水、盐搅匀过筛，摆入虾仁。',
      '盖保鲜膜扎孔，水开后中火蒸 8～10 分钟。',
      '淋少许生抽、香油即可。',
    ],
  },
  {
    id: 'broccoli-salad',
    name: '西兰花蔬菜沙拉',
    requiredIngredientIds: ['broccoli', 'tomato'],
    breakfastFriendly: true,
    lowCarb: true,
    summary: '焯水西兰花配番茄，清爽早餐配菜。',
    steps: [
      '西兰花掰小朵焯水 1 分钟，沥干放凉。',
      '番茄切块，与西兰花拌匀，加盐、橄榄油即可。',
    ],
  },
  {
    id: 'boiled-egg',
    name: '水煮蛋',
    requiredIngredientIds: ['egg'],
    breakfastFriendly: true,
    preferFeatured: true,
    lowCarb: true,
    summary: '水煮蛋白质，做法简单。',
    steps: [
      '冷水下鸡蛋，大火煮开后转小火 8～10 分钟。',
      '捞出过凉水剥壳，可配酱油或盐胡椒。',
    ],
  },
  {
    id: 'pan-fried-egg',
    name: '香煎蛋',
    requiredIngredientIds: ['egg'],
    breakfastFriendly: true,
    lowCarb: true,
    summary: '香煎鸡蛋，边缘微焦。',
    steps: [
      '热锅少油，打入鸡蛋中小火煎至蛋白凝固。',
      '可按喜好单面或双面煎，撒盐胡椒出锅。',
    ],
  },
  {
    id: 'steamed-egg-custard',
    name: '蒸蛋羹',
    requiredIngredientIds: ['egg'],
    breakfastFriendly: true,
    lowCarb: true,
    summary: '蒸制蛋羹，口感细腻。',
    steps: [
      '鸡蛋加 1.5 倍温水、少许盐搅匀过筛。',
      '盖保鲜膜扎孔，水开后中火蒸 10～12 分钟。',
      '淋生抽、香油，可撒葱花。',
    ],
  },
  {
    id: 'tomato-salad',
    name: '凉拌番茄',
    requiredIngredientIds: ['tomato'],
    breakfastFriendly: true,
    lowCarb: true,
    summary: '凉拌番茄，清爽开胃。',
    steps: [
      '番茄切片或块，撒少许白糖、盐。',
      '冷藏 10 分钟后食用口感更佳。',
    ],
  },
  {
    id: 'grilled-chicken',
    name: '香煎鸡胸肉',
    requiredIngredientIds: ['chicken-breast'],
    lowCarb: true,
    summary: '香煎鸡胸，低脂高蛋白。',
    steps: [
      '鸡胸拍松，盐、胡椒、柠檬汁腌制 15 分钟。',
      '平底锅少油中火两面各煎 4～5 分钟至熟透。',
      '静置 3 分钟再切片装盘。',
    ],
  },
  {
    id: 'beef-stir-fry',
    name: '小炒牛肉',
    requiredIngredientIds: ['beef'],
    dinnerMain: true,
    lowCarb: true,
    summary: '大火快炒牛肉，锁住肉汁。',
    steps: [
      '牛肉切薄片，生抽、淀粉、油抓腌。',
      '热锅旺火快炒至变色，可加洋葱或青椒。',
      '盐、黑胡椒调味，迅速出锅。',
    ],
  },
  {
    id: 'bread-toast',
    name: '鸡蛋三明治',
    requiredIngredientIds: ['bread', 'egg'],
    breakfastFriendly: true,
    preferFeatured: true,
    summary: '吐司夹煎蛋，经典早餐。',
    steps: [
      '面包微烤或煎至微黄。',
      '煎蛋铺在上面，可加芝士片（可选）。',
    ],
  },
  {
    id: 'bread-avocado-style',
    name: '开放式三明治',
    requiredIngredientIds: ['bread'],
    breakfastFriendly: true,
    summary: '面包配蔬菜，轻食早餐。',
    steps: [
      '面包烤至微脆。',
      '铺上生菜、番茄片、鸡胸等现有食材，淋酱汁即可。',
    ],
  },
]

export function recipeMatchesProfile(recipe: Recipe, profile: MealNutritionProfile): boolean {
  if (recipe.stapleOnly) return false

  const needsCarb = recipe.requiredIngredientIds.some((id) => STAPLE_CARB_IDS.has(id))

  switch (profile) {
    case 'no-carb':
      return !needsCarb && (recipe.lowCarb === true || recipe.requiredIngredientIds.length >= 2)
    case 'high-protein':
      return recipe.requiredIngredientIds.some((id) => MAIN_PROTEIN_IDS.has(id))
    case 'low-fat':
      return !recipe.requiredIngredientIds.includes('beef') || recipe.lowCarb === true
    default:
      return true
  }
}
