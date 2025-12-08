// ------------------------------------------------------------
// Helper: place a crafting table if none is already placed
async function ensurePlacedCraftingTable(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // Is there a placed table already?
  const placed = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (placed) {
    await bot.pathfinder.goto(new GoalNear(placed.position.x, placed.position.y, placed.position.z, 1));
    await bot.chat('Found a placed crafting table.');
    return placed;
  }

  // Need to place one from inventory
  const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
  if (!tableItem) throw new Error('No crafting table item in inventory.');

  // Find a solid block within 3 blocks to place on
  const solid = bot.findBlock({
    matching: b => b.name !== 'air',
    maxDistance: 3
  });
  if (!solid) throw new Error('No solid block nearby to place a crafting table on.');
  const placePos = solid.position.offset(0, 1, 0); // air block above solid
  await bot.chat(`Placing crafting table at ${placePos}`);
  await placeItem(bot, 'crafting_table', placePos);
  await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
  await bot.chat('Crafting table placed.');
  return bot.blockAt(placePos);
}

// ------------------------------------------------------------
// Helper: place a furnace if none is already placed

// ------------------------------------------------------------
// Helper: place a furnace if none is already placed
async function ensurePlacedFurnace(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const placed = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (placed) {
    await bot.pathfinder.goto(new GoalNear(placed.position.x, placed.position.y, placed.position.z, 1));
    await bot.chat('Found a placed furnace.');
    return placed;
  }

  // Need furnace item in inventory
  const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
  if (!furnaceItem) throw new Error('No furnace item in inventory.');

  // Find a solid block nearby
  const solid = bot.findBlock({
    matching: b => b.name !== 'air',
    maxDistance: 3
  });
  if (!solid) throw new Error('No solid block nearby to place a furnace on.');
  const placePos = solid.position.offset(0, 1, 0);
  await bot.chat(`Placing furnace at ${placePos}`);
  await placeItem(bot, 'furnace', placePos);
  await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
  await bot.chat('Furnace placed.');
  return bot.blockAt(placePos);
}

// ------------------------------------------------------------
// Helper: ensure we have at least `target` iron ingots

// ------------------------------------------------------------
// Helper: ensure we have at least `target` iron ingots
async function ensureIronIngots(bot, target) {
  const mcData = require('minecraft-data')(bot.version);
  const ingotId = mcData.itemsByName.iron_ingot.id;
  let have = bot.inventory.count(ingotId);
  if (have >= target) return;
  const need = target - have;
  await bot.chat(`Need ${need} more iron ingot(s).`);

  // 1️⃣ Get raw iron (mine iron ore)
  const rawId = mcData.itemsByName.raw_iron.id;
  let rawHave = bot.inventory.count(rawId);
  const rawNeeded = need - rawHave;
  if (rawNeeded > 0) {
    // Find iron ore, explore if necessary
    let ore = bot.findBlock({
      matching: mcData.blocksByName.iron_ore.id,
      maxDistance: 32
    });
    if (!ore) {
      await bot.chat('Searching for iron ore...');
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName.iron_ore.id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) throw new Error('Iron ore not found.');
      ore = bot.findBlock({
        matching: mcData.blocksByName.iron_ore.id,
        maxDistance: 32
      });
    }
    await bot.chat(`Mining ${rawNeeded} iron ore block(s)...`);
    await mineBlock(bot, 'iron_ore', rawNeeded);
  }

  // 2️⃣ Smelt raw iron → ingots
  const furnace = await ensurePlacedFurnace(bot);
  // Use any fuel we have (coal, wood, planks, etc.). We'll just use coal if available.
  const fuelName = bot.inventory.findInventoryItem(mcData.itemsByName.coal.id) ? 'coal' : 'oak_planks';
  await bot.chat(`Smelting ${need} raw iron into ingots using ${fuelName} as fuel...`);
  await smeltItem(bot, 'raw_iron', fuelName, need);
}

// ------------------------------------------------------------
// Helper: random direction vector (components -1,0,1, not all zero)

// ------------------------------------------------------------
// Helper: random direction vector (components -1,0,1, not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// ------------------------------------------------------------
// Main function: equip an iron helmet (crafting if necessary)

// ------------------------------------------------------------
// Main function: equip an iron helmet (crafting if necessary)
async function equipIronHelmet(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const helmetId = mcData.itemsByName.iron_helmet.id;

  // 1️⃣ Is a helmet already equipped?
  if (bot.inventory.slots[5] && bot.inventory.slots[5].type === helmetId) {
    await bot.chat('✅ Iron helmet is already equipped.');
    return;
  }

  // 2️⃣ Do we have a helmet in inventory?
  let helmetItem = bot.inventory.findInventoryItem(helmetId);
  if (helmetItem) {
    await bot.chat('Found iron helmet in inventory, equipping...');
    await bot.equip(helmetItem, 'head');
    await bot.chat('✅ Iron helmet equipped.');
    return;
  }

  // 3️⃣ Helmet missing – we need to craft it
  await bot.chat('Iron helmet not in inventory, preparing to craft one.');

  // 3a. Ensure we have at least 5 iron ingots
  await ensureIronIngots(bot, 5);

  // 3b. Ensure a crafting table is placed
  await ensurePlacedCraftingTable(bot);

  // 3c. Craft the helmet
  await bot.chat('Crafting iron helmet...');
  await craftItem(bot, 'iron_helmet', 1);
  await bot.chat('Iron helmet crafted.');

  // 3d. Equip the newly crafted helmet
  helmetItem = bot.inventory.findInventoryItem(helmetId);
  if (!helmetItem) {
    await bot.chat('❌ Unexpected error: helmet not found after crafting.');
    return;
  }
  await bot.equip(helmetItem, 'head');
  await bot.chat('✅ Iron helmet equipped.');
}