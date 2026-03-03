import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

// Categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('categories')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        res.json({ categories: data || [] });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const { data, error } = await supabaseAdmin
            .from('categories')
            .insert({ name, description: description || null })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const { data, error } = await supabaseAdmin
            .from('categories')
            .update({ name, description: description || null, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
};

// Subcategories
export const getSubcategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id } = req.query;
        let query = supabaseAdmin
            .from('subcategories')
            .select('*, categories(name)');

        if (category_id) {
            query = query.eq('category_id', category_id);
        }

        query = query.order('id', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        // Flatten the response to match the old MySQL format
        const rows = (data || []).map((s: any) => ({
            ...s,
            category_name: s.categories?.name || null,
            categories: undefined,
        }));

        res.json({ subcategories: rows });
    } catch (error) {
        console.error('Get subcategories error:', error);
        res.status(500).json({ error: 'Failed to fetch subcategories' });
    }
};

export const createSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id, name } = req.body;
        const { data, error } = await supabaseAdmin
            .from('subcategories')
            .insert({ category_id, name })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Create subcategory error:', error);
        res.status(500).json({ error: 'Failed to create subcategory' });
    }
};

export const updateSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { category_id, name } = req.body;
        const { data, error } = await supabaseAdmin
            .from('subcategories')
            .update({ category_id, name, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Update subcategory error:', error);
        res.status(500).json({ error: 'Failed to update subcategory' });
    }
};

export const deleteSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin.from('subcategories').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Subcategory deleted' });
    } catch (error) {
        console.error('Delete subcategory error:', error);
        res.status(500).json({ error: 'Failed to delete subcategory' });
    }
};

// Brands
export const getBrands = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id } = req.query;
        let query = supabaseAdmin
            .from('brands')
            .select('*, categories(name)');

        if (category_id) {
            query = query.eq('category_id', category_id);
        }

        query = query.order('name', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []).map((b: any) => ({
            ...b,
            category_name: b.categories?.name || null,
            categories: undefined,
        }));

        res.json({ brands: rows });
    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({ error: 'Failed to fetch brands' });
    }
};

export const createBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id, name } = req.body;
        const { data, error } = await supabaseAdmin
            .from('brands')
            .insert({ category_id, name })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Create brand error:', error);
        res.status(500).json({ error: 'Failed to create brand' });
    }
};

export const updateBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { category_id, name } = req.body;
        const { data, error } = await supabaseAdmin
            .from('brands')
            .update({ category_id, name, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Update brand error:', error);
        res.status(500).json({ error: 'Failed to update brand' });
    }
};

export const deleteBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin.from('brands').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Brand deleted' });
    } catch (error) {
        console.error('Delete brand error:', error);
        res.status(500).json({ error: 'Failed to delete brand' });
    }
};

// States
export const getStates = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('states')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        res.json({ states: data || [] });
    } catch (error) {
        console.error('Get states error:', error);
        res.status(500).json({ error: 'Failed to fetch states' });
    }
};

export const createState = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const { data, error } = await supabaseAdmin
            .from('states')
            .insert({ name, description: description || null })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Create state error:', error);
        res.status(500).json({ error: 'Failed to create state' });
    }
};

export const updateState = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const { data, error } = await supabaseAdmin
            .from('states')
            .update({ name, description: description || null, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Update state error:', error);
        res.status(500).json({ error: 'Failed to update state' });
    }
};

export const deleteState = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin.from('states').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'State deleted' });
    } catch (error) {
        console.error('Delete state error:', error);
        res.status(500).json({ error: 'Failed to delete state' });
    }
};
