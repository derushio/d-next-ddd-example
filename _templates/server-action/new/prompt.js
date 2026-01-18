/**
 * Server Action Generator Prompt
 * 対話式でServer Action生成に必要な情報を収集
 */
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'Action名（例: createOrder）:',
    validate: (input) => {
      if (!input) return 'Action名は必須です';
      if (!/^[a-z][a-zA-Z]+$/.test(input))
        return 'camelCaseで入力してください';
      return true;
    },
  },
  {
    type: 'input',
    name: 'domain',
    message: 'ドメイン名（例: order）:',
    validate: (input) => {
      if (!input) return 'ドメイン名は必須です';
      if (!/^[a-z]+$/.test(input)) return '小文字で入力してください';
      return true;
    },
  },
  {
    type: 'input',
    name: 'usecase',
    message: '呼び出すUseCase名（例: CreateOrder）:',
    validate: (input) => {
      if (!input) return 'UseCase名は必須です';
      if (!/^[A-Z][a-zA-Z]+$/.test(input))
        return 'PascalCaseで入力してください';
      return true;
    },
  },
];
