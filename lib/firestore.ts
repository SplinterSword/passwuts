import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./Firebase/initialize";

export async function savePassword(
  uid: string,
  data: any
) {
  const ref = collection(db, "users", uid, "vault");
  await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });
}
