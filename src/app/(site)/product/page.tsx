import { Suspense } from "react";
import ProductView from "./ProductView";

// One page for every product: /product/?slug=muslin-bib
// Products added later from the dashboard work without rebuilding the site.
export default function ProductPage() {
  return (
    <Suspense>
      <ProductView />
    </Suspense>
  );
}
