// Shows the one-line result an admin action redirected back with (?msg=...).
export default function Notice({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="admin-notice" role="status">
      {msg}
    </p>
  );
}
