// main function to obtain 4 oak logs
async function obtainFourOakLogs(bot) {
  // announce start
  await bot.chat("Task: obtain 4 oak logs.");

  // helper to count oak logs in inventory
  const countOakLogs = () => {
    const item = mcData.itemsByName["oak_log"];
    const invItem = bot.inventory.findInventoryItem(item.id);
    return invItem ? invItem.count : 0;
  };

  // possible direction vectors (each component is -1, 0, or 1)
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];

  // keep mining until we have 4 logs or we give up
  while (countOakLogs() < 4) {
    // try to find a log nearby
    let logBlock = bot.findBlock({
      matching: mcData.blocksByName["oak_log"].id,
      maxDistance: 32
    });

    // if not found, explore randomly until we locate one
    if (!logBlock) {
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      await bot.chat("Searching for oak logs...");
      logBlock = await exploreUntil(bot, randomDir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName["oak_log"].id,
          maxDistance: 32
        });
      });
      if (!logBlock) {
        await bot.chat("Couldn't find any oak logs after exploring.");
        break; // exit the loop; task failed
      }
    }

    // mine one oak log
    await bot.chat("Mining an oak log...");
    await mineBlock(bot, "oak_log", 1);

    // small pause to let the inventory update
    await bot.waitForTicks(5);
  }

  // final check
  if (countOakLogs() >= 4) {
    await bot.chat("Success! I now have at least 4 oak logs.");
  } else {
    await bot.chat(`Task incomplete: only ${countOakLogs()} oak log(s) in inventory.`);
  }
}