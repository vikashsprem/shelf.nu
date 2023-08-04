import type { User } from "@prisma/client";
import Stripe from "stripe";
import type { PriceWithProduct } from "~/components/subscription/prices";
import { db } from "~/database";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
  maxNetworkRetries: 2,
});

// copied from (https://github.com/kentcdodds/kentcdodds.com/blob/ebb36d82009685e14da3d4b5d0ce4d577ed09c63/app/utils/misc.tsx#L229-L237)
export function getDomainUrl(request: Request) {
  const host =
    request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");
  if (!host) {
    throw new Error("Could not determine domain URL.");
  }
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export const createStripeCheckoutSession = async ({
  priceId,
  userId,
  domainUrl,
  customerId,
}: {
  priceId: Stripe.Price["id"];
  userId: User["id"];
  domainUrl: string;
  customerId: string;
}): Promise<string> => {
  if (!stripe) return Promise.reject("Stripe not initialized");
  const SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!SECRET_KEY) return Promise.reject("Stripe secret key not found");

  const lineItems = [
    {
      price: priceId,
      quantity: 1,
    },
  ];
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${domainUrl}/settings/subscription?success=true`,
    cancel_url: `${domainUrl}/settings/subscription?canceled=true`,
    client_reference_id: userId,
    customer: customerId,
  });

  // @ts-ignore
  return session.url;
};

export const getStripePricesAndProducts = async () => {
  const pricesResponse = await stripe.prices.list({
    expand: ["data.product"],
  });
  const prices = groupPricesByInterval(
    pricesResponse.data as PriceWithProduct[]
  );
  return prices;
};

// Function to group prices by recurring interval
function groupPricesByInterval(prices: PriceWithProduct[]) {
  const groupedPrices: { [key: string]: PriceWithProduct[] } = {};

  for (const price of prices) {
    if (price?.recurring?.interval) {
      const interval = price?.recurring?.interval;
      if (!groupedPrices[interval]) {
        groupedPrices[interval] = [];
      }
      groupedPrices[interval].push(price);
    }
  }

  return groupedPrices;
}

export const createStripeCustomer = async ({
  name,
  email,
  userId,
}: {
  name: string;
  email: User["email"];
  userId: User["id"];
}) => {
  const { id: customerId } = await stripe.customers.create({
    email,
    name,
  });

  await db.user.update({
    where: { id: userId },
    data: { customerId },
  });

  return customerId;
};
