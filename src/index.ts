import express from "express";
import { BillingPeriod, PricingRule, PricingTier, Product } from "./types";

const products: Product[] = [
  {
    id: 1,
    name: "Basic T-Shirt",
    description: "Comfortable cotton t-shirt",
    pricingTiers: [
      {
        id: 1,
        name: "Single Purchase",
        pricingModel: "one_off",
        basePrice: 19.99,
      },
    ],
  },
  {
    id: 2,
    name: "Premium Hoodie",
    description: "High-quality hoodie",
    pricingTiers: [
      {
        id: 2,
        name: "Single Purchase",
        pricingModel: "one_off",
        basePrice: 49.99,
      },
    ],
  },
  {
    id: 3,
    name: "Pro Software License",
    description: "Professional software suite",
    pricingTiers: [
      {
        id: 3,
        name: "Monthly Subscription",
        pricingModel: "recurring",
        basePrice: 29.99,
        billingPeriod: "monthly",
        recurringDiscount: 0,
        features: ["Basic Features", "Cloud Storage", "Email Support"],
      },
      {
        id: 4,
        name: "Annual Subscription",
        pricingModel: "recurring",
        basePrice: 299.99,
        billingPeriod: "yearly",
        recurringDiscount: 15,
        features: [
          "Basic Features",
          "Cloud Storage",
          "Priority Support",
          "Advanced Analytics",
        ],
      },
      {
        id: 5,
        name: "Lifetime Deal",
        pricingModel: "one_off",
        basePrice: 999.99,
        billingPeriod: "lifetime",
        features: [
          "All Features",
          "Lifetime Updates",
          "Premium Support",
          "Unlimited Storage",
        ],
      },
    ],
  },
];

const pricingRules: PricingRule[] = [
  {
    id: 1,
    name: "Bulk Clothing Discount",
    type: "percentage_discount",
    value: 10,
    minQuantity: 3,
    applicablePricingModels: ["one_off"],
  },
  {
    id: 2,
    name: "Premium Hoodie Special",
    type: "fixed_discount",
    value: 5,
    productId: 2,
    applicablePricingModels: ["one_off"],
  },
  {
    id: 3,
    name: "Long-term Subscription Discount",
    type: "percentage_discount",
    value: 15,
    applicablePricingModels: ["recurring"],
  },
];

interface PriceCalculationResult {
  productName: string;
  tierName: string;
  basePrice: number;
  finalPrice: number;
  appliedRules: PricingRule[];
  savings: number;
  features?: string[];
  billingDetails?: {
    period: BillingPeriod;
    recurringDiscount: number;
    pricePerPeriod: number;
  };
}

function calculatePrice(
  productId: number,
  tierId: number,
  quantity: number = 1,
  commitmentMonths?: number
): PriceCalculationResult {
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const pricingTier = product.pricingTiers.find((t) => t.id === tierId);
  if (!pricingTier) {
    throw new Error("Pricing tier not found");
  }

  // Filter rules applicable to the product's pricing model
  const applicableRules = pricingRules.filter((rule) => {
    if (rule.productId && rule.productId !== productId) return false;
    if (rule.tierId && rule.tierId !== tierId) return false;
    if (rule.minQuantity && quantity < rule.minQuantity) return false;
    if (
      rule.applicablePricingModels &&
      !rule.applicablePricingModels.includes(pricingTier.pricingModel)
    )
      return false;
    return true;
  });

  let finalPrice = pricingTier.basePrice * quantity;
  const baseTotal = finalPrice;

  // Apply recurring discount if applicable
  if (
    pricingTier.pricingModel === "recurring" &&
    pricingTier.recurringDiscount
  ) {
    finalPrice -= finalPrice * (pricingTier.recurringDiscount / 100);
  }

  // Apply other pricing rules
  for (const rule of applicableRules) {
    switch (rule.type) {
      case "percentage_discount":
        finalPrice -= finalPrice * (rule.value / 100);
        break;
      case "fixed_discount":
        finalPrice -= rule.value * quantity;
        break;
      case "bulk_discount":
        if (quantity >= (rule.minQuantity || 1)) {
          finalPrice -= rule.value * quantity;
        }
        break;
    }
  }

  const result: PriceCalculationResult = {
    productName: product.name,
    tierName: pricingTier.name,
    basePrice: baseTotal,
    finalPrice: Math.max(0, Number(finalPrice.toFixed(2))),
    appliedRules: applicableRules,
    savings: Number((baseTotal - finalPrice).toFixed(2)),
    features: pricingTier.features,
  };

  // Add billing details for recurring products
  if (pricingTier.pricingModel === "recurring" && pricingTier.billingPeriod) {
    result.billingDetails = {
      period: pricingTier.billingPeriod,
      recurringDiscount: pricingTier.recurringDiscount || 0,
      pricePerPeriod: result.finalPrice,
    };
  }

  return result;
}

async function main() {
  const app = express();
  app.use(express.json());

  // Get all products with their pricing tiers
  app.get("/api/products", (req, res) => {
    res.json(products);
  });

  // Get specific product with pricing tiers
  app.get("/api/products/:id", (req, res) => {
    const product = products.find((p) => p.id === Number(req.params.id));
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  // Get all pricing rules
  app.get("/api/pricing-rules", (req, res) => {
    res.json(pricingRules);
  });

  // Calculate price for a product tier
  app.get("/api/pricing", (req, res) => {
    try {
      const productId = Number(req.query.productId);
      const tierId = Number(req.query.tierId);
      const quantity = Number(req.query.quantity) || 1;
      const commitmentMonths = req.query.commitmentMonths
        ? Number(req.query.commitmentMonths)
        : undefined;

      if (!productId || isNaN(productId) || !tierId || isNaN(tierId)) {
        return res
          .status(400)
          .json({ error: "Valid productId and tierId are required" });
      }

      const priceDetails = calculatePrice(
        productId,
        tierId,
        quantity,
        commitmentMonths
      );
      res.json(priceDetails);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  // Add a new product with pricing tiers
  app.post("/api/products", (req, res) => {
    const { name, description, pricingTiers } = req.body;

    if (!name || !description || !pricingTiers || !pricingTiers.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newProduct: Product = {
      id: Math.max(...products.map((p) => p.id), 0) + 1,
      name,
      description,
      pricingTiers: pricingTiers.map(
        (tier: Omit<PricingTier, "id">, index: number) => ({
          ...tier,
          id:
            Math.max(
              ...products.flatMap((p) => p.pricingTiers.map((t) => t.id)),
              0
            ) +
            index +
            1,
        })
      ),
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
  });

  // Add a new pricing rule
  app.post("/api/pricing-rules", (req, res) => {
    const {
      name,
      type,
      value,
      minQuantity,
      productId,
      tierId,
      applicablePricingModels,
    } = req.body;

    if (!name || !type || value === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newRule: PricingRule = {
      id: Math.max(...pricingRules.map((r) => r.id), 0) + 1,
      name,
      type,
      value,
      minQuantity,
      productId,
      tierId,
      applicablePricingModels,
    };

    pricingRules.push(newRule);
    res.status(201).json(newRule);
  });

  const port = 3100;
  app.listen(port, () => {
    console.log(`Pricing engine API running at http://localhost:${port}`);
  });
}

main().catch(console.error);
