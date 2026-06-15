import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RentaFiscalCasePage(_props: PageProps) {
  redirect("/");
}
