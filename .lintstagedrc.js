export default {
  "*": "prettier --write --ignore-unknown",
  "*.{js,ts,jsx,tsx}": ["oxlint --fix", "eslint --fix"]
};
