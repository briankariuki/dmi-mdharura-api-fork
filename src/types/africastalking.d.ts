declare module 'africastalking' {
  export default function (credentials: {
    apiKey: string;
    username: string;
  }): {
    SMS: { send(params: { to: string | string[]; message: string; enqueue?: boolean; from: string }): Promise<void> };
  };
}
