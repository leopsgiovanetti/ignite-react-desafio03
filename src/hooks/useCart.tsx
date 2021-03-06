import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  const [stock, setStock] = useState<Stock>({} as Stock)

  const addProduct = async (productId: number) => {
    try {
      //check if exists on stock
      await api.get<Stock>(`stock/${productId}`).then(response => {
        setStock(response.data)
        console.log("estoque:", response.data)
      })

      //check if already on cart
      const selectedProduct = cart.find(product => product.id === productId)

      //positive: update amount in 1 unit --> stock check on the other function
      if (selectedProduct) {
        const amount = selectedProduct.amount + 1
        await updateProductAmount({ productId, amount })
        return
      }
      //negative

      //check stock
      if (stock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
      }
      else {

        const { data: newProduct } = await api.get<Product>(`products/${productId}`)
        if (newProduct) {
          console.log("new:", newProduct)
          newProduct.amount = 1;
          setCart([...cart, newProduct])
          localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify([...cart, newProduct]))
          return
        }
        else {
          throw new Error('Erro na adi????o do produto')
        }
      }

    } catch {
      toast.error('Erro na adi????o do produto');

    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart]

      const index = newCart.findIndex(product => product.id === productId)

      if (index !== -1) {
        newCart.splice(index, 1)
        setCart(newCart)
        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(newCart))
      }
      else {
        throw new Error('Erro na remo????o do produto')
      }
    } catch {
      toast.error('Erro na remo????o do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (await checkStock(productId, amount) && amount > 0) {
        const newCart = [...cart]

        const targetProduct = newCart.find(product => product.id === productId)

        if (targetProduct) {
          targetProduct.amount = amount;
          setCart(newCart)
          localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify(newCart))
        }
        else {
          throw new Error('Erro na altera????o de quantidade do produto')
        }
      }
      else {
        throw new Error('Erro na altera????o de quantidade do produto')
      }

    } catch {
      toast.error('Erro na altera????o de quantidade do produto')
    }
  };


  const checkStock = async (productId: number, amount: number) => {

    const response = await api.get<Stock>(`stock/${productId}`)

    const { amount: selectedProductAmount } = response.data


    if (selectedProductAmount < amount) {
      toast.error('Quantidade solicitada fora de estoque');
      return false
    }
    else {
      return true
    }


  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
