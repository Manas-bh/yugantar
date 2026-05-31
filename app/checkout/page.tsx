"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, MapPin } from "lucide-react";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface AddressForm {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
}

interface SavedAddress extends AddressForm {
  district?: string;
  lastUsedAt: string;
}

type AddressFieldErrors = Partial<Record<keyof AddressForm, string>>;

interface PinLookupResponse {
  Status: string;
  PostOffice?: Array<{
    Name: string;
    District: string;
    State: string;
  }>;
}

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

const SAVED_ADDRESSES_KEY = "stylesage_saved_addresses";

function normalizeAddressPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getAddressKey(address: AddressForm): string {
  return [
    normalizeAddressPart(address.fullName),
    normalizeAddressPart(address.addressLine1),
    normalizeAddressPart(address.addressLine2 || ""),
    normalizeAddressPart(address.city),
    normalizeAddressPart(address.state),
    normalizeAddressPart(address.pinCode),
    normalizeAddressPart(address.phone),
  ].join("|");
}

function toSavedAddress(address: AddressForm, district?: string): SavedAddress {
  return {
    ...address,
    district,
    lastUsedAt: new Date().toISOString(),
  };
}

function dedupeSavedAddresses(addresses: SavedAddress[]): SavedAddress[] {
  const byKey = new Map<string, SavedAddress>();

  for (const item of addresses) {
    const key = getAddressKey(item);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    if (
      new Date(item.lastUsedAt).getTime() > new Date(existing.lastUsedAt).getTime()
    ) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) =>
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
}

function loadSavedAddresses(): SavedAddress[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(SAVED_ADDRESSES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SavedAddress[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return dedupeSavedAddresses(parsed);
  } catch {
    return [];
  }
}

function saveSavedAddresses(addresses: SavedAddress[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(addresses));
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [errors, setErrors] = useState<AddressFieldErrors>({});
  const [district, setDistrict] = useState("");
  const [isPinLookupLoading, setIsPinLookupLoading] = useState(false);
  const [pinLookupMessage, setPinLookupMessage] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});
  const formRef = useRef<HTMLFormElement | null>(null);

  const [address, setAddress] = useState<AddressForm>({
    fullName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    phone: "",
  });

  const shipping = subtotal > 1199 ? 0 : 99;
  const total = subtotal + shipping;

  useEffect(() => {
    let isMounted = true;
    let script: HTMLScriptElement | null = null;

    const initializeCheckout = async () => {
      try {
        const authResponse = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!authResponse.ok) {
          router.push("/auth?callbackUrl=/checkout");
          return;
        }

        const authData = await authResponse.json();
        if (!isMounted || !authData?.user) {
          return;
        }

        setUser(authData.user);

        if (authData.user.name) {
          setAddress((prev) => ({ ...prev, fullName: authData.user.name }));
        }
      } catch (error) {
        router.push("/auth?callbackUrl=/checkout");
      } finally {
        if (isMounted) {
          setAuthChecked(true);
        }
      }
    };

    if (items.length === 0) {
      router.push("/cart");
      return;
    }

    initializeCheckout();

    const localSavedAddresses = loadSavedAddresses();
    if (isMounted) {
      setSavedAddresses(localSavedAddresses);
    }

    // Load Razorpay script
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (!existingScript) {
      script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      isMounted = false;

      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [items, router]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    const loadAddressFromPreviousOrder = async () => {
      try {
        const response = await fetch("/api/orders", {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const latestOrderAddress = data?.orders?.[0]?.address;

        if (!latestOrderAddress || cancelled) {
          return;
        }

        setAddress((prev) => {
          if (
            prev.addressLine1.trim() ||
            prev.city.trim() ||
            prev.state.trim() ||
            prev.pinCode.trim() ||
            prev.phone.trim()
          ) {
            return prev;
          }

          return {
            fullName: latestOrderAddress.fullName || prev.fullName,
            addressLine1: latestOrderAddress.addressLine1 || "",
            addressLine2: latestOrderAddress.addressLine2 || "",
            city: latestOrderAddress.city || "",
            state: latestOrderAddress.state || "",
            pinCode: latestOrderAddress.pinCode || "",
            phone: latestOrderAddress.phone || "",
          };
        });
      } catch {
        // Ignore previous order auto-pick failures.
      }
    };

    loadAddressFromPreviousOrder();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "pinCode" || name === "phone") {
      value = value.replace(/\D/g, "");
    }

    setAddress((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));

    if (name === "pinCode") {
      setPinLookupMessage("");
      setDistrict("");
    }
  };

  useEffect(() => {
    const pinCode = address.pinCode.trim();

    if (pinCode.length !== 6) {
      setIsPinLookupLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(pinCode)) {
      setPinLookupMessage("PIN code must be exactly 6 digits");
      return;
    }

    let cancelled = false;

    const fetchPinDetails = async () => {
      setIsPinLookupLoading(true);
      setPinLookupMessage("");

      try {
        const response = await fetch(`/api/pincode?code=${pinCode}`);
        const data = (await response.json()) as PinLookupResponse[];
        const result = Array.isArray(data) ? data[0] : null;
        const postOffice = result?.PostOffice?.[0];

        if (!postOffice || result?.Status !== "Success") {
          if (!cancelled) {
            setPinLookupMessage("Could not auto-fetch city/state for this PIN code");
          }
          return;
        }

        if (cancelled) {
          return;
        }

        setAddress((prev) => ({
          ...prev,
          city: postOffice.Name || prev.city,
          state: postOffice.State || prev.state,
        }));
        setDistrict(postOffice.District || "");
        setPinLookupMessage("City/state auto-filled from PIN code");
      } catch {
        if (!cancelled) {
          setPinLookupMessage("Unable to fetch location from PIN code right now");
        }
      } finally {
        if (!cancelled) {
          setIsPinLookupLoading(false);
        }
      }
    };

    fetchPinDetails();

    return () => {
      cancelled = true;
    };
  }, [address.pinCode]);

  const getAddressErrors = (values: AddressForm): AddressFieldErrors => {
    const nextErrors: AddressFieldErrors = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required";
    }

    if (!values.addressLine1.trim()) {
      nextErrors.addressLine1 = "Address line 1 is required";
    }

    if (!values.city.trim()) {
      nextErrors.city = "City is required";
    } else if (!/^[A-Za-z][A-Za-z .-]{1,49}$/.test(values.city.trim())) {
      nextErrors.city = "Enter a valid city name";
    }

    if (!values.state.trim()) {
      nextErrors.state = "State is required";
    } else if (!/^[A-Za-z][A-Za-z .-]{1,49}$/.test(values.state.trim())) {
      nextErrors.state = "Enter a valid state name";
    }

    if (!values.pinCode.trim()) {
      nextErrors.pinCode = "PIN code is required";
    } else if (!/^\d{6}$/.test(values.pinCode.trim())) {
      nextErrors.pinCode = "PIN code must be exactly 6 digits";
    }

    if (!values.phone.trim()) {
      nextErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(values.phone.trim())) {
      nextErrors.phone = "Enter a valid 10-digit Indian mobile number";
    }

    return nextErrors;
  };

  const validateAddress = (values: AddressForm = address) => {
    const nextErrors = getAddressErrors(values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const syncAddressFromForm = (): AddressForm => {
    if (!formRef.current) {
      return address;
    }

    const formData = new FormData(formRef.current);
    const nextAddress: AddressForm = {
      fullName: String(formData.get("fullName") || "").trim(),
      addressLine1: String(formData.get("addressLine1") || "").trim(),
      addressLine2: String(formData.get("addressLine2") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      pinCode: String(formData.get("pinCode") || "").replace(/\D/g, ""),
      phone: String(formData.get("phone") || "").replace(/\D/g, ""),
    };

    setAddress(nextAddress);
    return nextAddress;
  };

  const isAddressValid = useMemo(
    () => Object.keys(getAddressErrors(address)).length === 0,
    [address]
  );

  const handlePayment = async () => {
    const latestAddress = syncAddressFromForm();

    if (!validateAddress(latestAddress)) {
      alert("Please fill in all required address fields.");
      return;
    }

    if (!user) {
      alert("Please log in to continue.");
      router.push("/auth");
      return;
    }

    setIsLoading(true);

    try {
      const dedupedSavedAddresses = dedupeSavedAddresses([
        toSavedAddress(latestAddress, district),
        ...savedAddresses,
      ]).slice(0, 10);

      setSavedAddresses(dedupedSavedAddresses);
      saveSavedAddresses(dedupedSavedAddresses);

      const orderData = {
        items: items.map((item) => ({
          productId: item.productId, // Use productId instead of id
          title: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.image,
        })),
        address: latestAddress,
        subtotal,
        shipping,
        total,
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(orderData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        // Handle stock validation errors
        if (data.error === "Insufficient stock") {
          alert(
            `Some items in your cart are out of stock:\n${data.message}\n\nPlease update your cart and try again.`
          );
          router.push("/cart");
          return;
        }

        alert(data.error || "Failed to create order");
        setIsLoading(false);
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        alert("Payment system is still loading. Please try again in a moment.");
        return;
      }

      // If successful, proceed with payment
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Yugantar",
        description: "T-Shirt Order Payment",
        order_id: data.order.id,
        handler: function (response: any) {
          // Payment successful
          handlePaymentSuccess(response, data.orderId);
        },
        modal: {
          ondismiss: function () {
            // Payment cancelled or failed
            handlePaymentFailure();
          },
        },
        prefill: {
          name: latestAddress.fullName,
          email: user.email || "",
          contact: latestAddress.phone,
        },
        theme: {
          color: "#000000",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (
    paymentResponse: any,
    orderId: string
  ) => {
    try {
      // Verify payment on server
      const verifyResponse = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          orderId,
        }),
      });

      const verifyData = await verifyResponse.json().catch(() => ({}));

      if (verifyResponse.ok && verifyData.success) {
        // Clear cart and redirect to orders page
        clearCart();
        window.location.replace("/orders?t=" + Date.now());
      } else {
        router.push(`/payment?status=failed&orderId=${orderId}`);
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      router.push(`/payment?status=failed&orderId=${orderId}`);
    }
  };

  const handlePaymentFailure = () => {
    router.push("/payment?status=failed");
  };

  const applySavedAddress = (selected: SavedAddress) => {
    setAddress({
      fullName: selected.fullName,
      addressLine1: selected.addressLine1,
      addressLine2: selected.addressLine2 || "",
      city: selected.city,
      state: selected.state,
      pinCode: selected.pinCode,
      phone: selected.phone,
    });
    setDistrict(selected.district || "");
    setPinLookupMessage("Address auto-filled from your saved addresses");
    setErrors({});
  };

  const getItemImageSrc = (itemKey: string, source?: string) => {
    if (!source || failedImages[itemKey]) {
      return "/placeholder.svg";
    }

    return source;
  };

  if (!user || items.length === 0) {
    if (!authChecked || items.length === 0) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Preparing checkout...</p>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="app-shell pt-4">
        <div className="section-shell mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6">
          <Link
            href="/cart"
            className="flex items-center space-x-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Cart</span>
          </Link>
          <h1 className="text-xl font-extrabold lowercase text-foreground">Checkout</h1>
          <div className="w-[120px]" aria-hidden="true" />
        </div>
      </div>

      <div className="app-shell mx-auto max-w-5xl py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Address Form */}
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Delivery Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form ref={formRef} className="space-y-4" autoComplete="on">
              {savedAddresses.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Use a saved address
                  </p>
                  <div className="space-y-2">
                    {savedAddresses.slice(0, 3).map((savedAddress) => (
                      <button
                        key={`${savedAddress.lastUsedAt}-${savedAddress.pinCode}`}
                        type="button"
                        onClick={() => applySavedAddress(savedAddress)}
                        className="w-full rounded-2xl border border-border bg-muted/50 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-muted"
                      >
                        <p className="font-medium text-foreground">
                          {savedAddress.fullName}
                        </p>
                        <p>
                          {savedAddress.addressLine1}
                          {savedAddress.addressLine2
                            ? `, ${savedAddress.addressLine2}`
                            : ""}
                        </p>
                        <p>
                          {savedAddress.city}, {savedAddress.state} -{" "}
                          {savedAddress.pinCode}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={address.fullName}
                    onChange={handleInputChange}
                    onInput={handleInputChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className={errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                  {errors.fullName ? (
                    <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
                  ) : null}
                </div>

              <div>
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    value={address.addressLine1}
                    onChange={handleInputChange}
                    onInput={handleInputChange}
                    placeholder="House number, street name"
                    autoComplete="address-line1"
                    className={errors.addressLine1 ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                  {errors.addressLine1 ? (
                    <p className="mt-1 text-xs text-red-600">{errors.addressLine1}</p>
                  ) : null}
                </div>

              <div>
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  value={address.addressLine2}
                  onChange={handleInputChange}
                  onInput={handleInputChange}
                  placeholder="Apartment, suite, etc. (optional)"
                  autoComplete="address-line2"
                />
              </div>

                <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={address.phone}
                    onChange={handleInputChange}
                    onInput={handleInputChange}
                    placeholder="Phone number"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel"
                    className={errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                  {errors.phone ? (
                    <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    name="pinCode"
                    value={address.pinCode}
                    onChange={handleInputChange}
                    onInput={handleInputChange}
                    placeholder="PIN Code"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="postal-code"
                    className={errors.pinCode ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                  {errors.pinCode ? (
                    <p className="mt-1 text-xs text-red-600">{errors.pinCode}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={address.city}
                    onChange={handleInputChange}
                    onInput={handleInputChange}
                    placeholder="City"
                    autoComplete="address-level2"
                    className={errors.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                  {errors.city ? (
                    <p className="mt-1 text-xs text-red-600">{errors.city}</p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    name="district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={address.state}
                    onChange={handleInputChange}
                    onInput={handleInputChange}
                    placeholder="State"
                    autoComplete="address-level1"
                    className={errors.state ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                  {errors.state ? (
                    <p className="mt-1 text-xs text-red-600">{errors.state}</p>
                  ) : null}
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground">
                    {isPinLookupLoading
                      ? "Fetching location from PIN code..."
                      : pinLookupMessage}
                  </p>
                </div>
              </div>
              </form>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-2xl font-extrabold lowercase">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    className="flex items-center space-x-3"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                      <Image
                        src={getItemImageSrc(`${item.id}-${item.size}`, item.image)}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [`${item.id}-${item.size}`]: true,
                          }))
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Size: {item.size} • Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <hr className="border-border" />

              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? "Free" : `₹${shipping.toFixed(2)}`}
                  </span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                disabled={isLoading || !isAddressValid}
                className="cta-pill-primary w-full justify-center"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹{total.toFixed(2)}</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
