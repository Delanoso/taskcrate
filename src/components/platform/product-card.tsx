import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HardLink } from "@/components/platform/hard-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhoneSandbox } from "@/components/marketing/phone-sandbox";
import type { ProductDefinition } from "@/data/products";
import { PAIR_ZAR } from "@/data/links";
import { formatRentLabel } from "@/data/products";

export function ProductCard({
  product,
  subscribed,
}: {
  product: ProductDefinition;
  subscribed?: boolean;
}) {
  return (
    <Card className="flex h-full flex-col border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{product.name}</CardTitle>
          <Badge variant="secondary">{product.category}</Badge>
        </div>
        <CardDescription>{product.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <PhoneSandbox productSlug={product.slug} compact />
        <p className="text-sm leading-relaxed">{product.solves}</p>
        <ul className="space-y-1 text-sm">
          {product.features.slice(0, 4).map((f) => (
            <li key={f} className="text-muted-foreground">
              · {f}
            </li>
          ))}
        </ul>
        <p className="pt-1 text-sm font-medium">{formatRentLabel()} alone · R{PAIR_ZAR.toLocaleString("en-ZA")} with a linked app</p>
      </CardContent>
      <CardFooter className="flex-col gap-2 sm:flex-row">
        <Button variant="outline" asChild className="w-full flex-1">
          <Link href={`/products/${product.slug}`}>View profile</Link>
        </Button>
        {subscribed ? (
          <HardLink
            href={`/dashboard/apps/${product.slug}`}
            className={cn(buttonVariants(), "w-full flex-1")}
          >
            Open
          </HardLink>
        ) : (
          <Button asChild className="w-full flex-1">
            <Link href={`/products/${product.slug}#purchase`}>Rent {formatRentLabel()}</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
