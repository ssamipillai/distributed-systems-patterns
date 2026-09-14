import { createFileRoute, Link } from "@tanstack/react-router";
import { Chapter } from "@/components/domain/chapter";
import { getDomain } from "@/lib/content/domains";

export const Route = createFileRoute("/d/$slug")({
  component: DomainPage,
  notFoundComponent: DomainMissing,
  head: ({ params }) => {
    const domain = getDomain(params.slug);
    return {
      meta: [
        { title: domain ? `${domain.short} · Quorum` : "Quorum" },
        {
          name: "description",
          content: domain?.dilemma ?? "Architecture field manual",
        },
      ],
    };
  },
});

function DomainPage() {
  const { slug } = Route.useParams();
  const domain = getDomain(slug);
  if (!domain) return <DomainMissing />;
  return <Chapter domain={domain} />;
}

function DomainMissing() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-mono text-2xs tracking-kicker text-muted uppercase">Unknown chapter</p>
      <h1 className="mt-3 font-display text-3xl text-fg">That dilemma is not in this edition.</h1>
      <Link
        to="/"
        className="mt-8 inline-flex h-12 items-center rounded-md bg-fg px-5 text-sm font-medium text-bg"
      >
        Return to the atlas
      </Link>
    </main>
  );
}
