// Main function: ensure the bot has at least one iron helmet
async function ensureIronHelmet(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- helper: random direction vector ----------
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // ---------- helper: ensure a placed crafting table ----------
  async function ensurePlacedCraftingTable() {
    const tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (tableBlock) {
      await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));
      await bot.chat('Found a placed crafting table.');
      return tableBlock;
    }
    await bot.chat('Placing a crafting table...');
    // find a solid block within 3 blocks
    const solid = bot.findBlock({
      matching: b => b.name !== 'air',
      maxDistance: 3
    });
    if (!solid) throw new Error('No solid block nearby to place a crafting table on');

    // try to find a free air block directly above or nearby
    let placePos = null;
    const candidates = [solid.position.offset(0, 1, 0), solid.position.offset(1, 1, 0), solid.position.offset(-1, 1, 0), solid.position.offset(0, 1, 1), solid.position.offset(0, 1, -1)];
    for (const p of candidates) {
      if (bot.blockAt(p).name === 'air') {
        placePos = p;
        break;
      }
    }
    if (!placePos) throw new Error('No free space to place a crafting table');
    await placeItem(bot, 'crafting_table', placePos);
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    await bot.chat('Crafting table placed.');
    return bot.blockAt(placePos);
  }

  // ---------- helper: ensure a placed furnace ----------
  async function ensurePlacedFurnace() {
    const furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (furnaceBlock) {
      await bot.pathfinder.goto(new GoalNear(furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 1));
      await bot.chat('Found a placed furnace.');
      return furnaceBlock;
    }
    await bot.chat('Placing a furnace...');
    const solid = bot.findBlock({
      matching: b => b.name !== 'air',
      maxDistance: 3
    });
    if (!solid) throw new Error('No solid block nearby to place a furnace');
    const placePos = solid.position.offset(0, 1, 0);
    await placeItem(bot, 'furnace', placePos);
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    await bot.chat('Furnace placed.');
    return bot.blockAt(placePos);
  }

  // ---------- helper: ensure we have enough iron ingots ----------
  async function ensureIronIngots(required) {
    const ingotId = mcData.itemsByName.iron_ingot.id;
    let have = bot.inventory.count(ingotId);
    if (have >= required) return;
    const need = required - have;
    await bot.chat(`Need ${need} more iron ingot(s).`);

    // Ensure raw iron
    const rawId = mcData.itemsByName.raw_iron.id;
    let rawHave = bot.inventory.count(rawId);
    const rawNeeded = need - rawHave;
    if (rawNeeded > 0) {
      // Locate iron ore, explore if necessary
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
        if (!found) throw new Error('Iron ore not found');
        ore = bot.findBlock({
          matching: mcData.blocksByName.iron_ore.id,
          maxDistance: 32
        });
      }
      await bot.chat(`Mining ${rawNeeded} iron ore block(s)...`);
      await mineBlock(bot, 'iron_ore', rawNeeded);
    }

    // Ensure furnace
    await ensurePlacedFurnace();

    // Use oak planks as fuel (they are common)
    await bot.chat(`Smelting ${need} raw iron into ingots...`);
    await smeltItem(bot, 'raw_iron', 'oak_planks', need);
  }

  // ---------- Step 0: check if we already have a helmet ----------
  const helmetId = mcData.itemsByName.iron_helmet.id;
  if (bot.inventory.count(helmetId) > 0) {
    await bot.chat('✅ I already have an iron helmet. No further action needed.');
    return;
  }

  // ---------- Step 1: gather materials ----------
  await ensureIronIngots(5);
  await bot.chat('Enough iron ingots are ready.');

  // ---------- Step 2: ensure a crafting table ----------
  await ensurePlacedCraftingTable();

  // ---------- Step 3: craft the helmet ----------
  await bot.chat('Crafting an iron helmet...');
  await craftItem(bot, 'iron_helmet', 1);
  await bot.chat('✅ Iron helmet crafted!');

  // ---------- Final verification ----------
  const finalCount = bot.inventory.count(helmetId);
  if (finalCount > 0) {
    await bot.chat(`I now have ${finalCount} iron helmet(s) in my inventory.`);
  } else {
    await bot.chat('❌ Something went wrong – no iron helmet was created.');
  }
}