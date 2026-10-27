import { Suspense } from "react";
import OrderForm from "./OrderForm";

export default function OrderPage() {
  return (
    <Suspense>
      <OrderForm />
    </Suspense>
  );
}
