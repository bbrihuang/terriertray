# TerrierTray

**Know what to put on your tray before you get to the dining hall.**

TerrierTray reads the real menus from Boston University's dining halls and helps you build a plate that fits your calories, your allergies and your diet. It runs in your browser. You don't need an account.

> Unofficial student project. Not affiliated with or endorsed by Boston University.

## What you can do

- **See what's being served.** West Campus, Warren Towers and Marciano Commons, up to a week ahead, meal by meal, with posted hours.
- **Get suggested plates.** Set a daily calorie target and TerrierTray suggests up to three plates from the current meal, using whole dining-hall servings. Don't like a dish? Tap **Not this** and it finds another. **Why this plan?** shows how it chose.
- **Build your own plate.** Add dishes from the Menu tab and watch the totals add up against your meal's share of the day.
- **Plan the week.** The Week tab lays out suggested meals for the next seven days at one hall.
- **Filter for allergies and diets.** Avoid specific allergens, or show only dishes labelled vegetarian, vegan, halal or gluten-free.
- **Light or dark.** Tap the sun/moon button in the top corner.

## Getting started

1. **Pick your dining hall and day** in the card at the top of the Plan tab.
2. **Set a calorie target.** Tap **Estimate my calories** to use our model, or type your own numbers in **Settings → Daily targets**. Protein, carbs and fat are optional.
3. **Answer the allergy question** in Settings. Suggestions stay off until you do, so nothing is recommended before your restrictions are known.
4. **Go to Plan** and choose a suggested plate, or add dishes yourself from **Menu**.

## The calorie estimate

Our team trained a model that estimates daily calories from your age, gender, height, weight and activity level.

- **You stay in control.** Nothing changes until you tap **Apply**, and only your calorie target changes.
- **Cutting or bulking?** Choose a goal and enter how many calories to subtract or add each day. It starts at 10% of the estimate, and you can change it. The model estimate, your adjustment and the final target are shown together.
- **It's an estimate, not advice.** It is typically off by about 111 kcal, and it can't predict weight change. If you're pregnant or breastfeeding, or you follow a medically prescribed diet, skip it and enter your own target.
- **Outside the model's range?** If your inputs fall outside the data it was trained on, it says so instead of guessing. You can always type a target yourself.

## Allergies: please read

TerrierTray can only filter on what BU Dining publishes, and **BU leaves the allergen list empty for many dishes**. An empty list does not mean allergen-free. By default, dishes with unknown allergens are left out of suggestions when you filter. Kitchens share equipment and recipes change, so **if you have an allergy, confirm with dining staff before eating.**

## Good to know

- **Menus update a few times a day.** Each menu shows when it was last fetched. If it's more than a day old, it's labelled and suggestions pause until fresh data arrives. You can still browse the menu.
- **Some nutrition is missing.** When a dish has no calorie data, totals read "at least" and say how many dishes they include.
- **Planned, not eaten.** Totals are what you planned, not a food log.

## Your privacy

- Your measurements for the calorie estimate are **never saved or sent anywhere**.
- Your allergies and targets stay in your browser. They're only remembered if you turn on **Remember my settings on this device**, and you can delete them anytime in Settings.
- No accounts and no tracking.

## About

Built by BU students for Hackcessability (Information Access track). Menu facts come from [BU Dining](https://www.bu.edu/dining/). Fenway isn't included yet.

Want to run or contribute to the code? See the [developer guide](docs/DEVELOPMENT.md).
