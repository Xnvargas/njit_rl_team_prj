// main function to collect at least 5 sugar cane
async function collectFiveSugarCane(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper: count items in inventory -----
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // ----- helper: pick a random horizontal direction (y = 0) -----
  function randomHorizontalDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ----- step 1: check current amount -----
  const TARGET = 5;
  let have = countItem('sugar_cane');
  if (have >= TARGET) {
    bot.chat(`I already have ${have} sugar cane.`);
    return;
  }
  bot.chat(`I have ${have} sugar cane, need ${TARGET - have} more.`);

  // ----- step 2: collect until we have enough -----
  while (have < TARGET) {
    // how many more we need
    const needed = TARGET - have;

    // try to find a sugar cane block nearby
    const block = bot.findBlock({
      matching: mcData.blocksByName.sugar_cane.id,
      maxDistance: 32
    });
    if (block) {
      // harvest up to the amount we still need (or all found blocks)
      const toMine = Math.min(needed, 1); // mineBlock can handle count >1, but we limit to needed
      bot.chat(`Found sugar cane at ${block.position}. Mining ${toMine} block(s).`);
      await mineBlock(bot, 'sugar_cane', toMine);
    } else {
      // no block nearby → explore until we see one
      bot.chat('No sugar cane nearby, exploring...');
      const found = await exploreUntil(bot, randomHorizontalDirection(), 60, () => {
        const b = bot.findBlock({
          matching: mcData.blocksByName.sugar_cane.id,
          maxDistance: 32
        });
        return b || null;
      });
      if (!found) {
        bot.chat('Exploration timed out without finding sugar cane. Stopping.');
        break;
      }
      // loop will try again and now the block should be found
      continue;
    }

    // re‑count after mining
    have = countItem('sugar_cane');
    bot.chat(`Now have ${have}/${TARGET} sugar cane.`);
  }
  if (have >= TARGET) {
    bot.chat(`✅ Collected ${have} sugar cane (target ${TARGET}).`);
  } else {
    bot.chat(`❌ Could not reach the target. I have ${have} sugar cane.`);
  }
}