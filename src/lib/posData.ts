export type Category = { id: string; name: string; emoji: string };
export type Product = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  emoji: string;
};

export const categories: Category[] = [
  { id: "all", name: "All", emoji: "🍽️" },
  { id: "starters", name: "Starters", emoji: "🥗" },
  { id: "mains", name: "Mains", emoji: "🍛" },
  { id: "pizza", name: "Pizza", emoji: "🍕" },
  { id: "burgers", name: "Burgers", emoji: "🍔" },
  { id: "drinks", name: "Drinks", emoji: "🥤" },
  { id: "desserts", name: "Desserts", emoji: "🍰" },
];

export const products: Product[] = [
  { id: "p1", name: "Caesar Salad", price: 8.5, categoryId: "starters", emoji: "🥗" },
  { id: "p2", name: "Bruschetta", price: 6.0, categoryId: "starters", emoji: "🍞" },
  { id: "p3", name: "Spring Rolls", price: 5.5, categoryId: "starters", emoji: "🥟" },
  { id: "p4", name: "Grilled Chicken", price: 14.0, categoryId: "mains", emoji: "🍗" },
  { id: "p5", name: "Beef Steak", price: 22.0, categoryId: "mains", emoji: "🥩" },
  { id: "p6", name: "Pasta Carbonara", price: 12.5, categoryId: "mains", emoji: "🍝" },
  { id: "p7", name: "Salmon Fillet", price: 18.0, categoryId: "mains", emoji: "🐟" },
  { id: "p8", name: "Margherita", price: 11.0, categoryId: "pizza", emoji: "🍕" },
  { id: "p9", name: "Pepperoni", price: 13.0, categoryId: "pizza", emoji: "🍕" },
  { id: "p10", name: "Four Cheese", price: 14.5, categoryId: "pizza", emoji: "🧀" },
  { id: "p11", name: "Classic Burger", price: 10.0, categoryId: "burgers", emoji: "🍔" },
  { id: "p12", name: "Cheese Burger", price: 11.5, categoryId: "burgers", emoji: "🍔" },
  { id: "p13", name: "Chicken Burger", price: 10.5, categoryId: "burgers", emoji: "🍔" },
  { id: "p14", name: "Coca Cola", price: 2.5, categoryId: "drinks", emoji: "🥤" },
  { id: "p15", name: "Fresh Juice", price: 4.0, categoryId: "drinks", emoji: "🧃" },
  { id: "p16", name: "Coffee", price: 3.0, categoryId: "drinks", emoji: "☕" },
  { id: "p17", name: "Mineral Water", price: 1.5, categoryId: "drinks", emoji: "💧" },
  { id: "p18", name: "Tiramisu", price: 6.5, categoryId: "desserts", emoji: "🍰" },
  { id: "p19", name: "Cheesecake", price: 6.0, categoryId: "desserts", emoji: "🍰" },
  { id: "p20", name: "Ice Cream", price: 4.5, categoryId: "desserts", emoji: "🍨" },
];

export const tables = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
