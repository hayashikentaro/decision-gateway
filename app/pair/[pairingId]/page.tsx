import Link from "next/link";

import { PairingClient } from "./PairingClient";

export default async function PairingPage({
  params,
}: {
  params: Promise<{ pairingId: string }>;
}) {
  const { pairingId } = await params;

  return (
    <main className="page">
      <div className="header">
        <div>
          <p className="eyebrow">Decision Gateway</p>
          <h1>Mobile pairing</h1>
        </div>
        <Link href="/">Home</Link>
      </div>
      <PairingClient pairingId={pairingId} />
    </main>
  );
}
