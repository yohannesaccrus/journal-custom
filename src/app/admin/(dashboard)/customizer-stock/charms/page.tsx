import { StockPage } from "../StockPage";
import { czPage } from "../pages";

export const dynamic = "force-dynamic";

const page = czPage("charms");

export default function Page() {
  return <StockPage title={page.title} sections={[...page.sections]} withProducts={page.withProducts} open={"open" in page ? [...page.open] : undefined} />;
}
