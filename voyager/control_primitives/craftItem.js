// --- Crafting-book helper: pick best recipe + compute missing items ---
// Uses Mineflayer's recipe DB
function getBestRecipeAndMissing(bot, itemByName, craftingTable) {
    // recipesAll gives all possible recipes for an item
    const recipes = bot.recipesAll(itemByName.id, null, craftingTable);

    if (!recipes || recipes.length === 0) {
        return { recipe: null, missingMessage: null };
    }

    let best = null;
    let bestMissingCount = Infinity;
    let bestMissingMessage = "";

    for (const r of recipes) {
        const delta = r.delta; // negative counts are ingredients required
        let missingCount = 0;
        let missingMsgParts = [];

        for (const d of delta) {
            if (d.count < 0) {
                const ingName = mcData.items[d.id].name;
                const need = -d.count;

                const invItem = bot.inventory.findInventoryItem(ingName, null);
                const have = invItem ? invItem.count : 0;

                if (have < need) {
                    const miss = need - have;
                    missingCount += miss;
                    missingMsgParts.push(`${miss} more ${ingName}`);
                }
            }
        }

        if (missingCount < bestMissingCount) {
            bestMissingCount = missingCount;
            best = r;
            bestMissingMessage = missingMsgParts.join(", ");
        }
    }

    return {
        recipe: best,
        missingMessage: bestMissingMessage, 
    };
}

async function craftItem(bot, name, count = 1) {
    // return if name is not string
    if (typeof name !== "string") {
        throw new Error("name for craftItem must be a string");
    }
    // return if count is not number
    if (typeof count !== "number") {
        throw new Error("count for craftItem must be a number");
    }
    const itemByName = mcData.itemsByName[name];
    if (!itemByName) {
        throw new Error(`No item named ${name}`);
    }
    const craftingTable = bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 32,
    });
    if (!craftingTable) {
        bot.chat("Craft without a crafting table");
    } else {
        await bot.pathfinder.goto(
            new GoalLookAtBlock(craftingTable.position, bot.world)
        );
    }
    // --- crafting-book precheck + best-recipe selection ---
    const { recipe, missingMessage } =
        getBestRecipeAndMissing(bot, itemByName, craftingTable);

    // If recipe exists but ingredients missing, tell the LLM before craft attempt.
    if (recipe && missingMessage) {
        bot.chat(`Crafting book says I need: ${missingMessage}`);
    }

    if (recipe) {
        bot.chat(`I can make ${name}`);
        try {
            await bot.craft(recipe, count, craftingTable);
            bot.chat(`I did the recipe for ${name} ${count} times`);
            _craftItemFailCount = 0; // reset fail counter on success
        } catch (err) {
            bot.chat(`I cannot do the recipe for ${name} ${count} times`);
        }
    } else {
        // keep original failure path
        failedCraftFeedback(bot, name, itemByName, craftingTable);
        _craftItemFailCount++;
        if (_craftItemFailCount > 10) {
            throw new Error(
                "craftItem failed too many times, check chat log to see what happened"
            );
        }
    }
}
