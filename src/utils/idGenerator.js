export const generateShortId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomStr = (length) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `${randomStr(1)}-${randomStr(3)}-${randomStr(3)}`;
};
