// main function
async function mineThreeGoldOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- 1. Equip an iron‑or‑better pickaxe ----------
  const diamondPick = bot.inventory.findInventoryItem(mcData.itemsByName.diamond_pickaxe?.id);
  const ironPick = bot.inventory.findInventoryItem(mcData.itemsByName.iron_pickaxe?.id);
  const pickaxe = diamondPick || ironPick;
  if (!pickaxe) {
    bot.chat('❌ I have no iron or better pickaxe, cannot mine gold ore.');
    return;
  }
  await bot.equip(pickaxe, 'hand');
  bot.chat(`✅ Equipped ${pickaxe.name} for mining.`);

  // ---------- 2. Helper: random horizontal direction ----------
  const randomHorizontal = () => {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };

  // ---------- 3. Helper: locate gold ore ----------
  const locateGoldOre = () => {
    return bot.findBlock({
      matching: mcData.blocksByName.gold_ore.id,
      maxDistance: 32
    });
  };

  // ---------- 4. Try to find gold ore nearby ----------
  let goldBlock = locateGoldOre();
  if (!goldBlock) {
    bot.chat('🔎 No gold ore nearby – starting exploration.');
    const direction = randomHorizontal();
    await exploreUntil(bot, direction, 60, () => locateGoldOre());
    goldBlock = locateGoldOre();
  }
  if (!goldBlock) {
    bot.chat('❌ Could not find any gold ore after exploration.');
    return;
  }

  // ---------- 5. Mine three gold ore blocks ----------
  bot.chat('⛏️ Mining 3 gold ore blocks...');
  await mineBlock(bot, 'gold_ore', 3);
  bot.chat('✅ Finished mining gold ore.');

  // ---------- 6. Report collected nuggets ----------
  const nugId = mcData.itemsByName.gold_nugget?.id;
  const nugCount = nugId ? bot.inventory.count(nugId) : 0;
  bot.chat(`📦 I now have ${nugCount} gold nugget(s).`);
}