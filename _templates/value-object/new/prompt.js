/**
 * Value Object Generator Prompt
 * 対話式でValue Object生成に必要な情報を収集
 */
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'Value Object名（例: Email, Money）:',
    validate: (input) => {
      if (!input) return 'Value Object名は必須です';
      if (!/^[A-Z][a-zA-Z]+$/.test(input))
        return 'PascalCaseで入力してください';
      return true;
    },
  },
  {
    type: 'list',
    name: 'type',
    message: '内部値の型:',
    choices: ['string', 'number', 'boolean', 'Date'],
    default: 'string',
  },
];
