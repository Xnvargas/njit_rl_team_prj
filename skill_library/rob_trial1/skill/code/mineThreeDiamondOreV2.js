// ------------------------------------------------------------
// Main function: mine three diamond ore blocks
// ------------------------------------------------------------
async function mineThreeDiamondOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helper: count items ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // ---------- helper: eat if hungry ----------
  async function ensureFood() {
    if (bot.food >= 14) return; // already fine
    const foodPriority = ['cooked_porkchop', 'cooked_beef', 'porkchop', 'beef'];
    for (const f of foodPriority) {
      const item = bot.inventory.findInventoryItem(mcData.itemsByName[f]?.id);
      if (item) {
        await bot.equip(item, 'hand');
        await bot.consume();
        bot.chat(`🍖 Ate ${f} (hunger ${bot.food}/20).`);
        if (bot.food >= 14) break;
      }
    }
  }

  // ---------- helper: best pickaxe ----------
  function getBestPickaxe() {
    const order = ['diamond_pickaxe', 'iron_pickaxe', 'golden_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
    for (const n of order) {
      const id = mcData.itemsByName[n]?.id;
      if (!id) continue;
      const item = bot.inventory.findInventoryItem(id);
      if (item) return item;
    }
    return null;
  }

  // ---------- helper: equip pickaxe ----------
  async function equipPickaxe() {
    const pick = getBestPickaxe();
    if (!pick) {
      bot.chat('❌ No pickaxe available for mining diamonds.');
      return false;
    }
    await bot.equip(pick, 'hand');
    bot.chat(`✅ Equipped ${pick.name} for mining.`);
    return true;
  }

  // ---------- helper: locate diamond ore ----------
  async function locateDiamondOre() {
    // try immediate detection
    let ore = bot.findBlock({
      matching: mcData.blocksByName.diamond_ore.id,
      maxDistance: 32
    });
    if (ore) return ore;

    // directions to explore (horizontal only)
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];

    // try a few random explorations
    for (let attempt = 0; attempt < 4; attempt++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      bot.chat(`🔎 Exploring ${dir} for diamond ore (attempt ${attempt + 1})...`);
      await exploreUntil(bot, dir, 60, () => {
        const found = bot.findBlock({
          matching: mcData.blocksByName.diamond_ore.id,
          maxDistance: 32
        });
        return found ? found : null; // stop early if found
      });
      ore = bot.findBlock({
        matching: mcData.blocksByName.diamond_ore.id,
        maxDistance: 32
      });
      if (ore) break;
    }
    return ore;
  }

  // ------------------- main procedure -------------------
  await ensureFood();
  const canMine = await equipPickaxe();
  if (!canMine) return; // abort if no pickaxe

  const oreBlock = await locateDiamondOre();
  if (!oreBlock) {
    bot.chat('❌ Could not locate any diamond ore after exploring.');
    return;
  }
  bot.chat(`✅ Found diamond ore at ${oreBlock.position}. Starting mining of 3 blocks...`);

  // Mine three diamond ore blocks (uses the generic helper)
  await mineBlock(bot, 'diamond_ore', 3);
  bot.chat('⛏️ Finished mining three diamond ore blocks.');

  // Verify we have at least three diamonds
  const diamonds = countItem('diamond');
  if (diamonds >= 3) {
    bot.chat(`✅ Success! I now have ${diamonds} diamond(s).`);
  } else {
    bot.chat(`⚠️ Mining done, but only ${diamonds} diamond(s) in inventory.`);
  }
}