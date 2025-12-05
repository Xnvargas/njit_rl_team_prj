// main function to craft one shield (robust version)
async function craftOneShieldRobust(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. ensure a crafting table ----------
  async function ensureCraftingTable() {
    let table = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (table) return table;
    const ctItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!ctItem) {
      bot.chat('❌ No crafting table item in inventory.');
      return null;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const dir = randomDirection();
      const pos = bot.entity.position.offset(dir.x, 0, dir.z);
      const block = bot.blockAt(pos);
      const below = bot.blockAt(pos.offset(0, -1, 0));
      if (block && block.name === 'air' && below && below.name !== 'air') {
        bot.chat(`Placing crafting table at ${pos}`);
        await placeItem(bot, 'crafting_table', pos);
        const placed = bot.blockAt(pos);
        if (placed && placed.name === 'crafting_table') return placed;
      }
    }
    bot.chat('❌ Could not find a place for the crafting table.');
    return null;
  }

  // ---------- 2. ensure enough planks of a specific type ----------
  async function ensurePlanksOfType(plankName, needed) {
    const current = countItem(plankName);
    if (current >= needed) return true;
    const missing = needed - current;

    // Determine the corresponding log name (e.g., oak_planks -> oak_log)
    const logName = plankName.replace('_planks', '_log');

    // Each log gives 4 planks
    const logsNeeded = Math.ceil(missing / 4);
    bot.chat(`Need ${missing} more ${plankName}. Mining ${logsNeeded} ${logName}...`);

    // Mine the required logs
    await mineBlock(bot, logName, logsNeeded);

    // Craft the planks from the mined logs
    bot.chat(`Crafting ${logsNeeded} ${logName} → ${plankName}...`);
    await craftItem(bot, plankName, logsNeeded);
    return countItem(plankName) >= needed;
  }

  // ---------- 3. pick the plank type that we have the most ----------
  function selectBestPlankType() {
    const plankTypes = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks'];
    let best = null;
    let bestCount = -1;
    for (const p of plankTypes) {
      const cnt = countItem(p);
      if (cnt > bestCount) {
        bestCount = cnt;
        best = p;
      }
    }
    return best;
  }

  // ---------- 4. ensure we have an iron ingot ----------
  async function ensureIronIngot() {
    if (countItem('iron_ingot') >= 1) return true;

    // Try to find raw iron first
    if (countItem('raw_iron') > 0) {
      const furnace = await ensureFurnace();
      if (!furnace) return false;
      const fuel = countItem('coal') > 0 ? 'coal' : null;
      if (!fuel) {
        bot.chat('❌ No coal for furnace fuel.');
        return false;
      }
      await smeltItem(bot, 'raw_iron', fuel, 1);
      return countItem('iron_ingot') >= 1;
    }

    // Search for iron ore
    bot.chat('Searching for iron ore...');
    const oreBlock = await exploreUntil(bot, randomDirection(), 60, () => {
      return bot.findBlock({
        matching: mcData.blocksByName.iron_ore.id,
        maxDistance: 32
      }) || null;
    });
    if (!oreBlock) {
      bot.chat('❌ No iron ore found.');
      return false;
    }
    bot.chat('Mining iron ore...');
    await mineBlock(bot, 'iron_ore', 1);
    const furnace = await ensureFurnace();
    if (!furnace) return false;
    const fuel = countItem('coal') > 0 ? 'coal' : null;
    if (!fuel) {
      bot.chat('❌ No coal for furnace fuel.');
      return false;
    }
    await smeltItem(bot, 'iron_ore', fuel, 1);
    return countItem('iron_ingot') >= 1;
  }

  // ---------- 5. ensure a furnace (needed for smelting) ----------
  async function ensureFurnace() {
    let furnace = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (furnace) return furnace;
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      bot.chat('❌ No furnace item in inventory.');
      return null;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const dir = randomDirection();
      const pos = bot.entity.position.offset(dir.x, 0, dir.z);
      const block = bot.blockAt(pos);
      const below = bot.blockAt(pos.offset(0, -1, 0));
      if (block && block.name === 'air' && below && below.name !== 'air') {
        bot.chat(`Placing furnace at ${pos}`);
        await placeItem(bot, 'furnace', pos);
        const placed = bot.blockAt(pos);
        if (placed && placed.name === 'furnace') return placed;
      }
    }
    bot.chat('❌ Could not place a furnace.');
    return null;
  }

  // ---------- Main workflow ----------
  bot.chat('🔧 Starting robust shield crafting process...');

  // 1. Crafting table
  const table = await ensureCraftingTable();
  if (!table) return;

  // 2. Choose plank type and ensure we have 6 of that type
  const bestPlank = selectBestPlankType();
  if (!bestPlank) {
    bot.chat('❌ No planks in inventory at all.');
    return;
  }
  bot.chat(`Using ${bestPlank} for the shield recipe.`);
  const havePlanks = await ensurePlanksOfType(bestPlank, 6);
  if (!havePlanks) {
    bot.chat('❌ Could not obtain enough planks.');
    return;
  }

  // 3. Ensure iron ingot
  const haveIron = await ensureIronIngot();
  if (!haveIron) {
    bot.chat('❌ Could not obtain an iron ingot.');
    return;
  }

  // 4. Craft the shield
  bot.chat('Crafting the shield...');
  try {
    await craftItem(bot, 'shield', 1);
  } catch (err) {
    bot.chat(`❌ Failed to craft shield: ${err.message}`);
    return;
  }

  // 5. Verify result
  if (countItem('shield') >= 1) {
    bot.chat('✅ Shield crafted successfully!');
  } else {
    bot.chat('❌ Shield not found in inventory after crafting.');
  }
}