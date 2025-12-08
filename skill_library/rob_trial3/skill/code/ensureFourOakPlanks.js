// Main function: ensure the bot ends up with exactly 4 oak planks
async function ensureFourOakPlanks(bot) {
  // 1️⃣ Check current oak planks
  const plankId = mcData.itemsByName["oak_planks"].id;
  let plankCount = bot.inventory.count(plankId);
  if (plankCount >= 4) {
    await bot.chat(`I already have ${plankCount} oak planks, no need to craft more.`);
    return;
  }

  // 2️⃣ How many more planks and how many logs we need
  const neededPlanks = 4 - plankCount;
  const craftTimes = Math.ceil(neededPlanks / 4); // each craft gives 4 planks
  const neededLogs = craftTimes; // 1 log → 4 planks

  // 3️⃣ Ensure we have enough oak logs
  const logId = mcData.itemsByName["oak_log"].id;
  let logCount = bot.inventory.count(logId);
  if (logCount < neededLogs) {
    const toMine = neededLogs - logCount;
    await bot.chat(`I need ${toMine} more oak log(s). Searching for logs...`);

    // Try to find a log nearby
    let logBlock = bot.findBlock({
      matching: b => b.name.endsWith("_log"),
      maxDistance: 32
    });

    // If not found, explore until we locate one
    if (!logBlock) {
      const randomDirection = () => {
        const choices = [-1, 0, 1];
        let vec;
        do {
          vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
        } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
        return vec;
      };
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: b => b.name.endsWith("_log"),
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("Couldn't find any oak log after exploring.");
        return;
      }
    }

    // Mine the required number of logs
    await bot.chat(`Mining ${toMine} oak log(s)...`);
    await mineBlock(bot, "oak_log", toMine);
    await bot.chat(`Mined ${toMine} oak log(s).`);
  } else {
    await bot.chat(`I already have ${logCount} oak log(s) in inventory.`);
  }

  // 4️⃣ Ensure a crafting table is available
  let craftingTable = bot.findBlock({
    matching: mcData.blocksByName["crafting_table"].id,
    maxDistance: 32
  });
  if (!craftingTable) {
    await bot.chat("No crafting table nearby, placing one...");
    // Choose a free spot next to the bot (one block east)
    const placePos = bot.entity.position.offset(1, 0, 0);
    // Ensure the target position is air; if not, shift further
    let finalPos = placePos;
    for (let i = 0; i < 5; i++) {
      const block = bot.blockAt(finalPos);
      if (block && block.name === "air") break;
      finalPos = finalPos.offset(1, 0, 0); // move east
    }
    await placeItem(bot, "crafting_table", finalPos);
    await bot.chat("Crafting table placed.");
    // Update reference
    craftingTable = bot.blockAt(finalPos);
  } else {
    await bot.chat("Found a crafting table nearby.");
  }

  // 5️⃣ Craft the oak planks
  await bot.chat(`Crafting oak planks (${craftTimes} time(s))...`);
  await craftItem(bot, "oak_planks", craftTimes);
  await bot.chat("Crafting done.");

  // 6️⃣ Report final count
  plankCount = bot.inventory.count(plankId);
  await bot.chat(`I now have ${plankCount} oak planks (target was 4).`);
}