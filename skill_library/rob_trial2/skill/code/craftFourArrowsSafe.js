// -----------------------------------------------------------------------------
// Helper utilities (reuse existing ones when possible)
// -----------------------------------------------------------------------------
async function countItem(bot, name) {
  const mcData = require('minecraft-data')(bot.version);
  const info = mcData.itemsByName[name];
  if (!info) return 0;
  const stack = bot.inventory.findInventoryItem(info.id);
  return stack ? stack.count : 0;
}

// Returns a random horizontal direction vector

// Returns a random horizontal direction vector
function randomDirection(bot) {
  const {
    Vec3
  } = require('vec3');
  const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

// Find a free air block that has at least one solid neighbour

// Find a free air block that has at least one solid neighbour
async function findFreePlacement(bot) {
  const {
    Vec3
  } = require('vec3');
  const solid = bot.findBlock({
    matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
    maxDistance: 32
  });
  if (!solid) return null;
  const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
  for (const off of offsets) {
    const pos = solid.position.offset(off.x, off.y, off.z);
    if (bot.blockAt(pos).name === 'air') return pos;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Main function: safely craft 4 arrows
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Main function: safely craft 4 arrows
// -----------------------------------------------------------------------------
async function craftFourArrowsSafe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1️⃣ Heal if health is low
  while (bot.health < 10 && countItem(bot, 'cod') > 0) {
    await bot.chat('🍣 Eating cod to heal...');
    const codStack = bot.inventory.findInventoryItem(mcData.itemsByName.cod.id);
    await bot.equip(codStack, 'hand');
    await bot.consume();
    await bot.waitForTicks(20); // give a moment for health to update
  }

  // 2️⃣ Ensure a crafting table is present
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('🛠️ No crafting table nearby – placing one...');
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory.');
      return;
    }
    const placePos = await findFreePlacement(bot);
    if (!placePos) {
      await bot.chat('❌ Could not locate a free spot to place the crafting table.');
      return;
    }
    await placeItem(bot, 'crafting_table', placePos);
    await bot.waitForTicks(5);
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to detect the placed crafting table.');
      return;
    }
    await bot.chat('✅ Crafting table placed.');
  } else {
    await bot.chat('✅ Crafting table already present.');
  }

  // 3️⃣ Gather materials ----------------------------------------------------
  // ---- Flint --------------------------------------------------------------
  while ((await countItem(bot, 'flint')) < 1) {
    await bot.chat('⛏️ Searching for gravel to obtain flint...');
    // Try to find gravel first
    let gravelBlock = bot.findBlock({
      matching: mcData.blocksByName.gravel.id,
      maxDistance: 32
    });
    if (!gravelBlock) {
      // Explore a bit until we see gravel
      await exploreUntil(bot, randomDirection(bot), 32, () => {
        const g = bot.findBlock({
          matching: mcData.blocksByName.gravel.id,
          maxDistance: 32
        });
        return g;
      });
      gravelBlock = bot.findBlock({
        matching: mcData.blocksByName.gravel.id,
        maxDistance: 32
      });
    }
    if (gravelBlock) {
      await mineBlock(bot, 'gravel', 5); // mine up to 5 gravel blocks
      await bot.waitForTicks(20);
    } else {
      await bot.chat('⚠️ No gravel found, cannot get flint.');
      break;
    }
  }
  await bot.chat(`✅ Flint count: ${await countItem(bot, 'flint')}`);

  // ---- Stick ---------------------------------------------------------------
  if ((await countItem(bot, 'stick')) < 1) {
    // Need planks first
    const totalPlanks = (await countItem(bot, 'oak_planks')) + (await countItem(bot, 'birch_planks')) + (await countItem(bot, 'spruce_planks')) + (await countItem(bot, 'jungle_planks')) + (await countItem(bot, 'acacia_planks')) + (await countItem(bot, 'dark_oak_planks'));
    if (totalPlanks < 2) {
      // Find any log we have
      const logNames = Object.keys(mcData.itemsByName).filter(n => n.endsWith('_log'));
      let logInfo = null;
      for (const n of logNames) {
        const info = mcData.itemsByName[n];
        if (bot.inventory.findInventoryItem(info.id)) {
          logInfo = info;
          break;
        }
      }
      if (!logInfo) {
        await bot.chat('❌ No logs available to craft planks.');
        return;
      }
      await bot.chat(`🪵 Crafting planks from ${logInfo.name}...`);
      await craftItem(bot, logInfo.name.replace('_log', '_planks'), 1); // 1 log → 4 planks
      await bot.waitForTicks(5);
    }
    // Now craft sticks (2 planks → 4 sticks)
    await bot.chat('🪓 Crafting sticks...');
    await craftItem(bot, 'stick', 1);
    await bot.waitForTicks(5);
  }
  await bot.chat(`✅ Stick count: ${await countItem(bot, 'stick')}`);

  // ---- Feather --------------------------------------------------------------
  if ((await countItem(bot, 'feather')) < 1) {
    await bot.chat('❌ Not enough feathers to craft arrows.');
    return;
  }
  await bot.chat(`✅ Feather count: ${await countItem(bot, 'feather')}`);

  // 4️⃣ Craft arrows if needed -----------------------------------------------
  const currentArrows = await countItem(bot, 'arrow');
  if (currentArrows >= 4) {
    await bot.chat(`✅ Already have ${currentArrows} arrows – task complete.`);
    return;
  }

  // Determine how many recipes we need (each recipe gives 4 arrows)
  const neededRecipes = Math.ceil((4 - currentArrows) / 4);
  await bot.chat(`🏹 Crafting ${neededRecipes * 4} arrows (${neededRecipes} recipe(s))...`);
  await craftItem(bot, 'arrow', neededRecipes);
  await bot.waitForTicks(5);

  // 5️⃣ Final report ---------------------------------------------------------
  const finalCount = await countItem(bot, 'arrow');
  if (finalCount >= 4) {
    await bot.chat(`✅ Success! Bot now has ${finalCount} arrows.`);
  } else {
    await bot.chat('⚠️ Crafting arrows failed or produced fewer than expected.');
  }
}