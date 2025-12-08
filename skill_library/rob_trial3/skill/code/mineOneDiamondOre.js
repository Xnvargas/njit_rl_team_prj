// main function: mine exactly one diamond ore safely
async function mineOneDiamondOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const Vec3 = require('vec3').Vec3;

  // ---------- helpers ----------
  // 1. Equip an iron (or better) pickaxe
  async function ensurePickaxe() {
    const order = ["netherite_pickaxe", "diamond_pickaxe", "iron_pickaxe", "stone_pickaxe", "golden_pickaxe", "wooden_pickaxe"];
    for (const name of order) {
      const id = mcData.itemsByName[name].id;
      const item = bot.inventory.findInventoryItem(id);
      if (item) {
        await bot.equip(item, "hand");
        await bot.chat(`✅ Pickaxe equipped: ${name}`);
        return true;
      }
    }
    await bot.chat("❌ No pickaxe (iron or better) found in inventory.");
    return false;
  }

  // 2. Ensure we have enough food and eat if needed
  async function ensureFood() {
    if (bot.food >= 12 && bot.health >= 14) return;
    const foodItem = bot.inventory.items().find(i => i.food);
    if (!foodItem) {
      await bot.chat("⚠️ No food in inventory, proceeding without eating.");
      return;
    }
    await bot.equip(foodItem, "hand");
    await bot.consume();
    await bot.chat("🍗 Eating food to restore hunger.");
  }

  // 3. Kill a nearby hostile mob (spider, zombie, creeper, etc.)
  async function handleNearbyMobs() {
    const hostile = bot.nearestEntity(e => {
      return (e.type === "mob" || e.type === "player") && ["spider", "zombie", "creeper", "skeleton", "enderman"].includes(e.name) && e.position.distanceTo(bot.entity.position) < 12;
    });
    if (!hostile) return true; // no threat

    // ensure we have a weapon
    const sword = bot.inventory.findInventoryItem(mcData.itemsByName.iron_sword.id);
    if (sword) await bot.equip(sword, "hand");else {
      const bow = bot.inventory.findInventoryItem(mcData.itemsByName.bow.id);
      if (bow) await bot.equip(bow, "hand");
    }
    await bot.chat(`⚔️ Engaging hostile ${hostile.name}`);
    try {
      await killMob(bot, hostile.name, 30);
      await bot.chat(`✅ ${hostile.name} eliminated.`);
      return true;
    } catch (e) {
      await bot.chat(`❗ Failed to kill ${hostile.name}: ${e.message}`);
      return false;
    }
  }

  // 4. Random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 5. Find a diamond ore block (regular or deepslate)
  async function locateDiamondOre() {
    const oreIds = [mcData.blocksByName.diamond_ore.id, mcData.blocksByName.deepslate_diamond_ore.id];
    // quick search
    let oreBlock = bot.findBlock({
      matching: b => oreIds.includes(b.type),
      maxDistance: 32
    });
    if (oreBlock) return oreBlock;

    // explore until found
    await bot.chat("🔎 Exploring for diamond ore...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: b => oreIds.includes(b.type),
        maxDistance: 32
      });
      return blk ? blk : null;
    });
    if (!found) return null;
    // after exploration, locate again
    return bot.findBlock({
      matching: b => oreIds.includes(b.type),
      maxDistance: 32
    });
  }

  // ---------- execution ----------
  // 1) Pickaxe
  if (!(await ensurePickaxe())) return;

  // 2) Food / health safety
  await ensureFood();

  // 3) Deal with nearby hostile mobs
  if (!(await handleNearbyMobs())) return;

  // 4) Locate the diamond ore
  const oreBlock = await locateDiamondOre();
  if (!oreBlock) {
    await bot.chat("❌ Could not find any diamond ore within the time limit.");
    return;
  }
  await bot.chat(`✅ Diamond ore located at ${oreBlock.position}`);

  // 5) Move next to the ore
  await bot.pathfinder.goto(new GoalNear(oreBlock.position.x, oreBlock.position.y, oreBlock.position.z, 1));

  // 6) Mine exactly one ore (use the correct block name)
  const oreName = oreBlock.name; // "diamond_ore" or "deepslate_diamond_ore"
  await bot.chat(`⛏️ Mining ${oreName}...`);
  await mineBlock(bot, oreName, 1);

  // 7) Verify we obtained a diamond
  const diamondId = mcData.itemsByName.diamond.id;
  const count = bot.inventory.count(diamondId);
  if (count > 0) {
    await bot.chat(`✅ Success! Collected ${count} diamond(s).`);
  } else {
    await bot.chat("❌ Mining finished but no diamond was obtained.");
  }
}