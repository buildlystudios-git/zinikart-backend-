export async function sendFcmPush(userId: string, data: any) {
  // TODO: implement FCM logic to push notifications to the user
  console.log(`[FCM Push] Sending push to user ${userId} for message`, data.content || data.id)
}
