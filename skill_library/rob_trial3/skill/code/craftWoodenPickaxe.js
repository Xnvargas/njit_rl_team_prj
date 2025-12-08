// main function to craft a wooden pickaxe, handling all prerequisites
async function craftWoodenPickaxe(bot) {
  const plankName = "oak_planks";
  const stickName = "stick";
  const pickaxeName = "wooden_pickaxe";
  const tableName = "crafting_table";

  // --------------------------------------------------------------
  // Helper: ensure we have at least `target` oak planks
  // --------------------------------------------------------------
  async function ensurePlanks(target) {
    const plankId = mcData.itemsByName[plankName].id;
    let have = bot.inventory.count(plankId);
    if (have >= target) {
      await bot.chat(`Planks OK: ${have}/${target}`);
      return;
    }
    const missing = target - have;
    const logsNeeded = Math.ceil(missing / 4); // 1 log → 4 planks

    // find any log nearby (any type)
    let logBlock = bot.findBlock({
      matching: b => b.name.endsWith("_log"),
      maxDistance: 32
    });

    // if none, explore until we see one
    if (!logBlock) {
      await bot.chat("Searching for a log to make planks...");
      const randomDir = () => {
        const choices = [-1, 0, 1];
        let v;
        do {
          v = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
        } while (v.x === 0 && v.y === 0 && v.z === 0);
        return v;
      };
      const found = await exploreUntil(bot, randomDir(), 60, () => {
        const blk = bot.findBlock({
          matching: b => b.name.endsWith("_log"),
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Could not locate any log.");
        return;
      }
    }

    // mine the required logs (any log type works)
    await bot.chat(`Mining ${logsNeeded} log(s) for planks...`);
    // try oak first, fallback to generic logs
    try {
      await mineBlock(bot, "oak_log", logsNeeded);
    } catch (_) {
      await mineBlock(bot, "birch_log", logsNeeded);
    }

    // craft the missing planks
    const craftTimes = Math.ceil(missing / 4);
    await bot.chat(`Crafting ${missing} plank(s) (${craftTimes} operation(s))...`);
    await ensureCraftingTable(); // make sure a table is placed before crafting
    await craftItem(bot, plankName, craftTimes);
    await bot.chat("Plank crafting done.");
  }

  // --------------------------------------------------------------
  // Helper: ensure we have at least `target` sticks
  // --------------------------------------------------------------
  async function ensureSticks(target) {
    const stickId = mcData.itemsByName[stickName].id;
    let have = bot.inventory.count(stickId);
    if (have >= target) {
      await bot.chat(`Sticks OK: ${have}/${target}`);
      return;
    }
    const missing = target - have;
    const craftsNeeded = Math.ceil(missing / 4); // 1 craft → 4 sticks
    const planksNeeded = craftsNeeded * 2; // each craft consumes 2 planks

    await ensurePlanks(planksNeeded);
    await ensureCraftingTable();
    await bot.chat(`Crafting ${missing} stick(s) (${craftsNeeded} operation(s))...`);
    await craftItem(bot, stickName, craftsNeeded);
    await bot.chat("Stick crafting done.");
  }

  // --------------------------------------------------------------
  // Helper: ensure we have a crafting‑table *item* in inventory
  // --------------------------------------------------------------
  async function ensureCraftingTableItem() {
    const tableId = mcData.itemsByName[tableName].id;
    if (bot.inventory.count(tableId) > 0) {
      await bot.chat("Crafting table item already in inventory.");
      return;
    }
    await bot.chat("Need to craft a crafting table item.");
    await ensurePlanks(4); // 4 planks → 1 table
    await bot.chat("Crafting the crafting table item...");
    await craftItem(bot, tableName, 1);
    await bot.chat("Crafting table item crafted.");
  }

  // --------------------------------------------------------------
  // Helper: place a crafting table on solid ground near the bot
  // --------------------------------------------------------------
  async function placeCraftingTableNearBot() {
    await ensureCraftingTableItem();

    // find a solid block within 3 blocks of the bot
    const solidBlock = bot.findBlock({
      matching: b => b.name !== "air",
      maxDistance: 3
    });
    if (!solidBlock) {
      await bot.chat("❌ No solid block nearby to place a crafting table on.");
      return false;
    }
    const placePos = solidBlock.position.offset(0, 1, 0); // air block above solid
    const targetBlock = bot.blockAt(placePos);
    if (!targetBlock || targetBlock.name !== "air") {
      await bot.chat("❌ The space above the solid block is not free.");
      return false;
    }
    await bot.chat(`Placing crafting table at ${placePos}`);
    await placeItem(bot, tableName, placePos);
    // move next to the table so we can use it
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    await bot.chat("Crafting table placed and bot is nearby.");
    return true;
  }

  // --------------------------------------------------------------
  // Helper: ensure a placed crafting table is reachable
  // --------------------------------------------------------------
  async function ensureCraftingTable() {
    // check for an already placed table
    const placed = bot.findBlock({
      matching: mcData.blocksByName[tableName].id,
      maxDistance: 32
    });
    if (placed) {
      await bot.chat("Found a placed crafting table nearby.");
      await bot.pathfinder.goto(new GoalNear(placed.position.x, placed.position.y, placed.position.z, 1));
      return;
    }
    // otherwise place a new one
    await bot.chat("No placed crafting table nearby, placing one...");
    const success = await placeCraftingTableNearBot();
    if (!success) {
      throw new Error("Failed to place a crafting table.");
    }
  }

  // --------------------------------------------------------------
  // Main sequence
  // --------------------------------------------------------------
  await bot.chat("=== Starting wooden pickaxe crafting routine ===");

  // 1) Ensure we have a usable crafting table (placed)
  await ensureCraftingTable();

  // 2) Ensure we have at least 3 planks
  await ensurePlanks(3);

  // 3) Ensure we have at least 2 sticks
  await ensureSticks(2);

  // 4) Craft the wooden pickaxe
  await bot.chat("Crafting wooden pickaxe...");
  await craftItem(bot, pickaxeName, 1);
  await bot.chat("Wooden pickaxe crafted!");

  // 5) Report result
  const pickaxeId = mcData.itemsByName[pickaxeName].id;
  const hasPickaxe = bot.inventory.findInventoryItem(pickaxeId);
  if (hasPickaxe) {
    await bot.chat("✅ Successfully obtained a wooden pickaxe.");
  } else {
    await bot.chat("❌ Failed to craft the wooden pickaxe.");
  }
}