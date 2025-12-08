// ------------------------------------------------------------------
// Helper: count how many items of a given name the bot has
function countItem(bot, name) {
  const mcData = require('minecraft-data')(bot.version);
  const itemInfo = mcData.itemsByName[name];
  if (!itemInfo) return 0;
  const invItem = bot.inventory.findInventoryItem(itemInfo.id);
  return invItem ? invItem.count : 0;
}

// Helper: make sure we have at least one oak log

// Helper: make sure we have at least one oak log
async function ensureOakLog(bot) {
  const mcData = require('minecraft-data')(bot.version);
  if (countItem(bot, 'oak_log') >= 1) return true;

  // try to find a log nearby
  let logBlock = bot.findBlock({
    matching: mcData.blocksByName['oak_log'].id,
    maxDistance: 32
  });

  // if not found, explore randomly until we locate one
  if (!logBlock) {
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    await bot.chat('Looking for an oak log...');
    logBlock = await exploreUntil(bot, randomDir, 60, () => {
      return bot.findBlock({
        matching: mcData.blocksByName['oak_log'].id,
        maxDistance: 32
      });
    });
  }
  if (!logBlock) {
    await bot.chat('❌ Could not find any oak log.');
    return false;
  }

  // mine one oak log
  await bot.chat('Mining an oak log...');
  await mineBlock(bot, 'oak_log', 1);
  await bot.waitForTicks(5); // let inventory update
  return countItem(bot, 'oak_log') >= 1;
}

// Helper: ensure a crafting table is reachable (placed or in inventory)

// Helper: ensure a crafting table is reachable (placed or in inventory)
async function ensureCraftingTable(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // 1) Look for a placed crafting table nearby
  const tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (tableBlock) return true; // already have one

  // 2) Do we have a crafting table item in inventory?
  const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
  if (!tableItem) {
    await bot.chat('❌ No crafting table item and none placed.');
    return false;
  }

  // 3) Place it next to the bot
  const placePos = bot.entity.position.offset(1, 0, 0);
  await bot.chat('Placing a crafting table...');
  await placeItem(bot, 'crafting_table', placePos);
  // give a tiny pause for the block to appear
  await bot.waitForTicks(5);
  return true;
}

// ------------------------------------------------------------------
// Main function: craft at least four oak planks

// ------------------------------------------------------------------
// Main function: craft at least four oak planks
async function craftFourOakPlanks(bot) {
  const mcData = require('minecraft-data')(bot.version);
  await bot.chat('🪵 Starting task: craft 4 oak planks.');

  // 1) Quick win: already have enough planks?
  if (countItem(bot, 'oak_planks') >= 4) {
    await bot.chat('✅ Already have 4+ oak planks.');
    return;
  }

  // 2) Ensure we have at least one oak log to turn into planks
  const haveLog = await ensureOakLog(bot);
  if (!haveLog) {
    await bot.chat('❌ Cannot continue without an oak log.');
    return;
  }

  // 3) Try to use the helper craftItem (needs a crafting table)
  const tableReady = await ensureCraftingTable(bot);
  if (tableReady) {
    // Use the provided helper – it will place us near the table and craft
    await bot.chat('Crafting oak planks using the crafting table...');
    await craftItem(bot, 'oak_planks', 1); // 1 recipe = 4 planks
  } else {
    // 4) Fallback: use the 2×2 inventory grid directly
    await bot.chat('No crafting table available – using inventory grid.');
    const plankItem = mcData.itemsByName['oak_planks'];
    const logItem = mcData.itemsByName['oak_log'];
    // Ensure the log is in the hotbar (required for bot.craft)
    const logInv = bot.inventory.findInventoryItem(logItem.id);
    if (logInv) await bot.equip(logInv, 'hand');
    const recipe = bot.recipesFor(plankItem.id, null, 1, null)[0];
    if (!recipe) {
      await bot.chat('❌ No recipe found for oak planks.');
      return;
    }
    await bot.craft(recipe, 1, null); // one craft = 4 planks
  }

  // 5) Final verification
  if (countItem(bot, 'oak_planks') >= 4) {
    await bot.chat('✅ Success! I now have at least 4 oak planks.');
  } else {
    await bot.chat(`❌ Task failed – only ${countItem(bot, 'oak_planks')} planks present.`);
  }
}