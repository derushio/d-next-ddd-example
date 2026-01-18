/**
 * Hygen 設定ファイル
 * テンプレートで使用するヘルパー関数を定義
 */
module.exports = {
  templates: '_templates',
  helpers: {
    /**
     * camelCase → PascalCase
     * @example toPascalCase('createOrder') => 'CreateOrder'
     */
    toPascalCase(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * PascalCase → camelCase
     * @example toCamelCase('CreateOrder') => 'createOrder'
     */
    toCamelCase(str) {
      if (!str) return '';
      return str.charAt(0).toLowerCase() + str.slice(1);
    },

    /**
     * PascalCase → UPPER_SNAKE_CASE
     * @example toUpperSnake('CreateOrder') => 'CREATE_ORDER'
     */
    toUpperSnake(str) {
      if (!str) return '';
      return str
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase()
        .replace(/^_/, '');
    },

    /**
     * PascalCase → kebab-case
     * @example toKebabCase('CreateOrder') => 'create-order'
     */
    toKebabCase(str) {
      if (!str) return '';
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    },

    /**
     * 現在の日付を取得
     */
    today() {
      return new Date().toISOString().split('T')[0];
    },
  },
};
