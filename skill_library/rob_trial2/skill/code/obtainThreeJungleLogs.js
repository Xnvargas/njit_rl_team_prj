// -----------------------------------------------------------------------------
// Helper: count items of a given name in the bot's inventory
function countItem(bot, name) {
  const mcData = require('minecraft-data')(bot.version);
  const info = mcData.itemsByName[name];
  if (!info) return 0;
  const stack = bot.inventory.findInventoryItem(info.id);
  return stack ? stack.count : 0;
}

// Helper: ensure we have a tool (pickaxe or axe) equipped in the hand

// Helper: ensure we have a tool (pickaxe or axe) equipped in the hand
async function ensureTool(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const tool = bot.inventory.items().find(item => {
    const n = mcData.items[item.type]?.name;
    return n && (n.endsWith('_pickaxe') || n.endsWith('_axe'));
  });
  if (!tool) {
    // try to craft a wooden axe (3 planks + 2 sticks)
    const plankInfo = mcData.itemsByName['oak_planks']; // any plank works
    const stickInfo = mcData.itemsByName['stick'];
    const plankCount = countItem(bot, 'oak_planks') + countItem(bot, 'jungle_planks');
    const stickCount = countItem(bot, 'stick');
    if (plankCount >= 3 && stickCount >= 2) {
      await bot.chat('🔨 Crafting a wooden axe for faster log collection...');
      await craftItem(bot, 'wooden_axe', 1);
    } else {
      await bot.chat('❌ No suitable tool (pickaxe/axe) and not enough materials to craft one.');
      return false;
    }
  }
  // equip the first found tool
  const finalTool = bot.inventory.items().find(item => {
    const n = mcData.items[item.type]?.name;
    return n && (n.endsWith('_pickaxe') || n.endsWith('_axe'));
  });
  if (finalTool) {
    await bot.equip(finalTool, 'hand');
    await bot.chat(`🛡️ Equipped ${mcData.items[finalTool.type].name} for mining.`);
    return true;
  }
  return false;
}

// Helper: pick a random horizontal direction (X or Z non‑zero, Y = 0)

// Helper: pick a random horizontal direction (X or Z non‑zero, Y = 0)
function randomHorizontalDirection() {
  const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

// -----------------------------------------------------------------------------
// Main function: obtain three jungle logs

// -----------------------------------------------------------------------------
// Main function: obtain three jungle logs
async function obtainThreeJungleLogs(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  await bot.chat('🚀 Starting task: obtain 3 jungle logs.');

  // 1) Current amount
  let have = countItem(bot, 'jungle_log');
  if (have >= 3) {
    await bot.chat(`✅ Already have ${have} jungle logs. Task complete.`);
    return;
  }

  // 2) Ensure we have a tool
  const toolOk = await ensureTool(bot);
  if (!toolOk) {
    await bot.chat('❌ Cannot continue without a tool.');
    return;
  }

  // 3) Repeatedly mine / explore until we have 3 logs
  const maxAttempts = 10; // safety guard
  let attempts = 0;
  while (have < 3 && attempts < maxAttempts) {
    const needed = 3 - have;
    await bot.chat(`🔎 Trying to mine ${needed} jungle log(s) nearby...`);
    // mineBlock will look for up to `needed` logs within 32 blocks
    await mineBlock(bot, 'jungle_log', needed);
    // recount
    have = countItem(bot, 'jungle_log');
    if (have >= 3) break;

    // not enough yet → explore in a random direction
    const dir = randomHorizontalDirection();
    await bot.chat(`🗺️ Not enough logs, exploring in direction ${dir} (attempt ${attempts + 1})...`);
    await exploreUntil(bot, dir, 60, () => {
      const block = bot.findBlock({
        matching: mcData.blocksByName.jungle_log.id,
        maxDistance: 32
      });
      return block ? true : null;
    });
    attempts++;
  }

  // 4) Final report
  have = countItem(bot, 'jungle_log');
  if (have >= 3) {
    await bot.chat(`✅ Task complete! Collected ${have} jungle logs.`);
  } else {
    await bot.chat(`⚠️ Task ended with only ${have} jungle logs after ${attempts} attempts.`);
  }
}