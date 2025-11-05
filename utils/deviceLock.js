export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem("device_id");
  if (!id) {
    const rand = crypto?.getRandomValues?.(new Uint8Array(16)) || Array.from({length:16},()=>Math.floor(Math.random()*256));
    id = Array.from(rand).map(b=>b.toString(16).padStart(2,"0")).join("");
    localStorage.setItem("device_id", id);
  }
  return id;
}
